import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/rbac";

// Schema validation based on financial_transactions table (SAK compliance)
const financialTransactionCreateSchema = z.object({
  transaction_date: z.string()
    .min(1, "Tanggal transaksi wajib diisi")
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Format tanggal tidak valid (YYYY-MM-DD)",
    }),
  transaction_number: z.string()
    .min(1, "Nomor transaksi wajib diisi")
    .max(50, "Nomor transaksi maksimal 50 karakter")
    .regex(/^[A-Za-z0-9-/]+$/, "Nomor transaksi hanya boleh berisi huruf, angka, dash, dan slash"),
  jenis_transaksi: z.enum(["PENERIMAAN", "PENGELUARAN", "TRANSFER"])
    .default("PENGELUARAN"),
  jumlah_idr: z.number()
    .positive("Jumlah transaksi harus lebih dari 0")
    .max(1000000000000, "Jumlah transaksi terlalu besar"),
  description: z.string()
    .min(1, "Deskripsi transaksi wajib diisi")
    .max(1000, "Deskripsi transaksi maksimal 1000 karakter"),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PAID", "RECONCILED"])
    .default("DRAFT"),
  ledger_id: z.string()
    .uuid("ID ledger tidak valid")
    .optional()
    .nullable(),
  supporting_document_url: z.string()
    .url("URL dokumen pendukung tidak valid")
    .optional()
    .nullable(),
  project_id: z.string()
    .uuid("ID proyek tidak valid")
    .optional()
    .nullable(),
  budget_id: z.string()
    .uuid("ID anggaran tidak valid")
    .optional()
    .nullable(),
  // Double-entry accounting fields
  debit_account_code: z.string()
    .min(1, "Kode akun debit wajib diisi")
    .max(20, "Kode akun debit maksimal 20 karakter"),
  credit_account_code: z.string()
    .min(1, "Kode akun kredit wajib diisi")
    .max(20, "Kode akun kredit maksimal 20 karakter"),
});

export async function POST(request: NextRequest) {
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

    // Check if user has permission to create financial transactions
    const canCreate = await hasPermission("FINANCIAL_TRANSACTION_CREATE", session.user.id);
    if (!canCreate) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk membuat transaksi keuangan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = financialTransactionCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validasi gagal", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Additional validation: Debit and credit accounts must be different
    if (data.debit_account_code === data.credit_account_code) {
      return NextResponse.json(
        { error: "Akun debit dan kredit tidak boleh sama (prinsip double-entry)" },
        { status: 400 }
      );
    }

    // Check if transaction_code already exists (use transaction_code not transaction_number)
    const { data: existingTransaction } = await supabase
      .from("financial_transactions")
      .select("id")
      .eq("transaction_code", data.transaction_number) // Map transaction_number to transaction_code
      .single();

    if (existingTransaction) {
      return NextResponse.json(
        { error: `Nomor transaksi '${data.transaction_number}' sudah digunakan` },
        { status: 409 }
      );
    }

    // Validate project exists if provided
    if (data.project_id) {
      const { data: project } = await supabase
        .from("carbon_projects")
        .select("id, project_name")
        .eq("id", data.project_id)
        .single();
      
      if (!project) {
        return NextResponse.json(
          { error: "Proyek tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    // Validate budget exists if provided
    if (data.budget_id) {
      const { data: budget } = await supabase
        .from("financial_budgets")
        .select("id, budget_name")
        .eq("id", data.budget_id)
        .single();
      
      if (!budget) {
        return NextResponse.json(
          { error: "Anggaran tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    // Prepare insert data to match existing database schema
    const insertData: any = {
      transaction_code: data.transaction_number, // Map to transaction_code
      transaction_date: new Date(data.transaction_date).toISOString(),
      description: data.description,
      amount: data.jumlah_idr, // Map jumlah_idr to amount
      currency: "IDR",
      transaction_type: data.jenis_transaksi === "PENERIMAAN" ? "income" : 
                       data.jenis_transaksi === "PENGELUARAN" ? "expense" : "transfer",
      status: data.status === "DRAFT" ? "pending" : data.status.toLowerCase(),
      project_id: data.project_id || null,
      budget_id: data.budget_id || null,
      created_by: session.user.id,
    };

    // Add payment_method if not provided
    if (!insertData.payment_method) {
      insertData.payment_method = "transfer";
    }

    // Insert into database with correct table joins
    const { data: newTransaction, error } = await supabase
      .from("financial_transactions")
      .insert(insertData)
      .select(`
        *,
        carbon_projects:project_id (project_name, project_code),
        financial_budgets:budget_id (budget_name),
        profiles:created_by (full_name, role)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal membuat transaksi keuangan", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Transaksi keuangan berhasil dibuat", 
        data: newTransaction,
        id: newTransaction.id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Check if user has permission to view financial transactions
    const canView = await hasPermission("FINANCIAL_VIEW", session.user.id);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin untuk melihat transaksi keuangan" },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const transaction_type = searchParams.get("transaction_type"); // Use transaction_type instead of jenis_transaksi
    const project_id = searchParams.get("project_id");
    const budget_id = searchParams.get("budget_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const search = searchParams.get("search");

    let query = supabase
      .from("financial_transactions")
      .select(`
        *,
        carbon_projects:project_id (project_name, project_code),
        financial_budgets:budget_id (budget_name),
        profiles:created_by (full_name, role)
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    
    if (transaction_type) {
      query = query.eq("transaction_type", transaction_type);
    }

    if (project_id) {
      query = query.eq("project_id", project_id);
    }

    if (budget_id) {
      query = query.eq("budget_id", budget_id);
    }

    // Date range filter
    if (start_date) {
      query = query.gte("transaction_date", start_date);
    }

    if (end_date) {
      query = query.lte("transaction_date", end_date);
    }

    // Search filter
    if (search) {
      query = query.or(`transaction_code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.order("transaction_date", { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data transaksi", details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend expectations
    const transformedTransactions = (transactions || []).map(tx => ({
      id: tx.id,
      transaction_date: tx.transaction_date,
      transaction_number: tx.transaction_code, // Map transaction_code to transaction_number
      jenis_transaksi: tx.transaction_type === 'income' ? 'PENERIMAAN' : 
                       tx.transaction_type === 'expense' ? 'PENGELUARAN' : 'TRANSFER',
      jumlah_idr: tx.amount, // Map amount to jumlah_idr
      description: tx.description,
      status: tx.status?.toUpperCase() || 'PENDING',
      ledger_name: 'General Ledger', // Default value since ledger_id doesn't exist
      created_by_name: tx.profiles?.full_name || 'System'
    }));

    // Calculate totals using transformed data
    const totalReceipts = transformedTransactions
      .filter(tx => tx.jenis_transaksi === "PENERIMAAN")
      .reduce((sum, tx) => sum + tx.jumlah_idr, 0) || 0;

    const totalPayments = transformedTransactions
      .filter(tx => tx.jenis_transaksi === "PENGELUARAN")
      .reduce((sum, tx) => sum + tx.jumlah_idr, 0) || 0;

    const totalTransfers = transformedTransactions
      .filter(tx => tx.jenis_transaksi === "TRANSFER")
      .reduce((sum, tx) => sum + tx.jumlah_idr, 0) || 0;

    return NextResponse.json(
      { 
        data: transformedTransactions,
        summary: {
          total_transactions: count || 0,
          total_receipts: totalReceipts,
          total_payments: totalPayments,
          total_transfers: totalTransfers,
          net_cash_flow: totalReceipts - totalPayments
        },
        pagination: {
          limit,
          offset,
          total: count || 0
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}