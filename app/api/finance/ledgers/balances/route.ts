import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to view financial data
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat data keuangan" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const ledger_type = searchParams.get("ledger_type");
    const is_active = searchParams.get("is_active");

    let ledgersData: any[] = [];
    let fetchError = null;

    try {
      // First try to fetch from accounting_ledgers table
      let query = supabase
        .from("accounting_ledgers")
        .select(`
          id,
          ledger_code,
          ledger_name,
          ledger_type,
          description,
          opening_balance,
          current_balance,
          currency,
          is_active,
          created_at,
          profiles:created_by (full_name)
        `, { count: 'exact' });

      // Apply filters
      if (ledger_type) {
        query = query.eq("ledger_type", ledger_type);
      }
      
      if (is_active) {
        query = query.eq("is_active", is_active === "true");
      }

      // Order by ledger code
      query = query.order("ledger_code", { ascending: true });

      const { data, error: queryError, count } = await query;

      if (queryError) {
        console.warn("Database error fetching accounting_ledgers:", queryError.message);
        fetchError = queryError;
      } else {
        ledgersData = data || [];
      }
    } catch (error) {
      console.warn("Exception fetching accounting_ledgers:", error);
      fetchError = error as Error;
    }

    // If accounting_ledgers table doesn't exist or is empty, calculate from financial_transactions
    if (ledgersData.length === 0) {
      console.log("ℹ️  No ledger data found, calculating from transactions...");
      
      try {
        // Fetch transactions to calculate ledger balances
        const { data: transactions, error: transactionsError } = await supabase
          .from("financial_transactions")
          .select(`
            id,
            transaction_date,
            jenis_transaksi,
            jumlah_idr,
            ledger_id,
            status,
            accounting_ledgers:ledger_id (ledger_code, ledger_name)
          `)
          .in("status", ["APPROVED", "PAID", "RECONCILED"])
          .order("transaction_date", { ascending: true });

        if (!transactionsError && transactions) {
          // Group transactions by ledger
          const ledgerMap = new Map<string, any>();
          
          transactions.forEach(tx => {
            if (tx.ledger_id && tx.accounting_ledgers && Array.isArray(tx.accounting_ledgers) && tx.accounting_ledgers.length > 0) {
              const ledgerId = tx.ledger_id;
              const ledgerName = tx.accounting_ledgers[0]?.ledger_name;
              const ledgerCode = tx.accounting_ledgers[0]?.ledger_code;
              
              if (!ledgerMap.has(ledgerId)) {
                ledgerMap.set(ledgerId, {
                  id: ledgerId,
                  ledger_code: ledgerCode,
                  ledger_name: ledgerName,
                  ledger_type: ledgerCode && ledgerCode.includes('OPR') ? 'OPERATIONAL' : 
                             ledgerCode && ledgerCode.includes('PRJ-CARBON') ? 'PROJECT' : 
                             ledgerCode && ledgerCode.includes('PRJ-SOSIAL') ? 'PROJECT' : 'OPERATIONAL',
                  opening_balance: 0,
                  current_balance: 0,
                  total_receipts: 0,
                  total_payments: 0,
                  currency: 'IDR',
                  is_active: true
                });
              }
              
              const ledger = ledgerMap.get(ledgerId)!;
              if (tx.jenis_transaksi === 'PENERIMAAN') {
                ledger.total_receipts += tx.jumlah_idr || 0;
              } else if (tx.jenis_transaksi === 'PENGELUARAN') {
                ledger.total_payments += tx.jumlah_idr || 0;
              }
            }
          });
          
          // Calculate current balances
          Array.from(ledgerMap.values()).forEach(ledger => {
            // For now, set opening balance as 0 and current balance as net
            // In a real system, we would need historical opening balances
            ledger.current_balance = ledger.total_receipts - ledger.total_payments;
          });
          
          ledgersData = Array.from(ledgerMap.values());
          console.log(`✅ Calculated ${ledgersData.length} ledgers from transactions`);
        } else {
          console.warn("No transactions found to calculate ledger balances");
        }
      } catch (calcError) {
        console.warn("Error calculating ledger balances:", calcError);
      }
    }

    // Format data for frontend (matching LedgerBalance interface)
    const formattedData = ledgersData.map(ledger => ({
      ledger_code: ledger.ledger_code || `LEDGER-${ledger.id?.substring(0, 8)}`,
      ledger_name: ledger.ledger_name || "Unnamed Ledger",
      opening_balance: ledger.opening_balance || 0,
      total_receipts: ledger.total_receipts || 0,
      total_payments: ledger.total_payments || 0,
      closing_balance: ledger.current_balance || (ledger.opening_balance || 0) + (ledger.total_receipts || 0) - (ledger.total_payments || 0)
    }));

    // Calculate summary
    const totalBalance = formattedData.reduce((sum, ledger) => sum + ledger.closing_balance, 0);
    const totalReceipts = formattedData.reduce((sum, ledger) => sum + ledger.total_receipts, 0);
    const totalPayments = formattedData.reduce((sum, ledger) => sum + ledger.total_payments, 0);
    const netCashFlow = totalReceipts - totalPayments;

    return NextResponse.json(
      { 
        data: formattedData,
        summary: {
          total_ledgers: formattedData.length,
          total_balance: totalBalance,
          total_receipts: totalReceipts,
          total_payments: totalPayments,
          net_cash_flow: netCashFlow
        },
        metadata: {
          source: fetchError ? "calculated_from_transactions" : "accounting_ledgers_table",
          has_errors: !!fetchError,
          error_message: fetchError?.message
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Unexpected error in ledgers/balances API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        data: [], // Return empty data instead of erroring out
        summary: {
          total_ledgers: 0,
          total_balance: 0,
          total_receipts: 0,
          total_payments: 0,
          net_cash_flow: 0
        }
      },
      { status: 500 }
    );
  }
}