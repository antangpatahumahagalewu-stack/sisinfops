import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to the login page
        await page.goto("http://localhost:3000/id/login", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Test 1: Verify that unauthenticated users cannot access protected routes
        # Try to access dashboard without login
        await page.goto("http://localhost:3000/id/dashboard", wait_until="commit", timeout=10000)
        
        # Check if we are redirected back to login or shown an unauthorized message
        current_url = page.url
        if '/login' in current_url:
            print("Test passed: Unauthenticated user redirected to login page when accessing dashboard")
        else:
            # Check for unauthorized message or login form
            try:
                await expect(page.locator('text=/Login|Masuk|Unauthorized|Not authorized/')).to_be_visible(timeout=5000)
                print("Test passed: Unauthenticated user shown unauthorized message")
            except AssertionError:
                # If we're still on dashboard, check for login form elements
                try:
                    await expect(page.locator('input[id="email"]')).to_be_visible(timeout=3000)
                    print("Test passed: Login form shown when accessing dashboard without authentication")
                except AssertionError:
                    await page.screenshot(path='tc003_unauthenticated_access.png', full_page=True)
                    raise AssertionError('Test case failed: Unauthenticated user was able to access dashboard without proper redirect or error message')
        
        # Test 2: Verify role-based access (this would require test users with different roles)
        # Since we don't have test credentials for different roles, we'll document this limitation
        print("Note: Full RBAC testing requires test accounts with different roles (admin, monev, viewer, etc.)")
        print("To complete this test, you need to:")
        print("1. Create test users with different roles in Supabase")
        print("2. Log in with each role")
        print("3. Verify access to role-specific features")
        print("4. Verify restrictions on unauthorized features")
        
        # Placeholder for actual RBAC testing
        # Example structure for when test credentials are available:
        """
        # Test with admin role
        await page.goto("http://localhost:3000/id/login", wait_until="commit", timeout=10000)
        await page.fill('input[id="email"]', 'admin@example.com')
        await page.fill('input[id="password"]', 'adminpassword')
        await page.click('button[type="submit"]')
        
        # Verify admin can access admin-only features
        await expect(page.locator('text=/Admin|Administrator/')).to_be_visible(timeout=10000)
        
        # Test with viewer role  
        await page.goto("http://localhost:3000/id/login", wait_until="commit", timeout=10000)
        await page.fill('input[id="email"]', 'viewer@example.com')
        await page.fill('input[id="password"]', 'viewerpassword')
        await page.click('button[type="submit"]')
        
        # Verify viewer cannot access admin features
        try:
            await expect(page.locator('text=/Admin|Administrator/')).to_be_visible(timeout=5000)
            raise AssertionError('Viewer should not have access to admin features')
        except AssertionError:
            print("Test passed: Viewer role correctly restricted from admin features")
        """
        
        await asyncio.sleep(1)  # Brief pause for observation
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())