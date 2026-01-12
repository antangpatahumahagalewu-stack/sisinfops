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
        
        # Fill in invalid credentials
        await page.fill('input[id="email"]', 'invalid@example.com')
        await page.fill('input[id="password"]', 'wrongpassword')
        
        # Listen for network responses to capture any errors
        error_response = []
        def on_response(response):
            if 'supabase.co' in response.url and response.status >= 400:
                error_response.append(response)
        page.on('response', on_response)
        
        # Submit the form
        await page.click('button[type="submit"]')
        
        # Wait for any network response (timeout 10 seconds)
        try:
            await page.wait_for_event('response', timeout=10000)
        except:
            pass  # No response event, continue
        
        # Wait for an error message to appear (timeout 10 seconds)
        # The error message is expected to be in an alert with role="alert"
        # or contain text indicating an error (in English or Indonesian)
        try:
            # Wait for the alert to appear
            await expect(page.locator('[role="alert"]')).to_be_visible(timeout=10000)
        except AssertionError:
            # If no alert, look for any text that indicates error
            # Include both English and Indonesian error keywords
            try:
                await expect(page.locator('text=/Invalid|invalid|Error|error|Kesalahan|Gagal|Terjadi|failed|Failed/')).to_be_visible(timeout=5000)
            except AssertionError:
                # If still not found, check if we are still on the login page (no redirect)
                current_url = page.url
                if '/login' not in current_url:
                    raise AssertionError(f'Test case failed: Unexpected redirect after invalid login. Current URL: {current_url}')
                
                # Debug: print page content and network responses
                page_text = await page.text_content('body')
                print(f"Page body text (first 500 chars): {page_text[:500]}")
                if error_response:
                    for resp in error_response:
                        print(f"Error response: {resp.url} - {resp.status}")
                        try:
                            print(f"Response body: {await resp.text()}")
                        except:
                            pass
                
                # If we are still on the login page and no error message, then the test fails
                await page.screenshot(path='tc002_failure.png', full_page=True)
                raise AssertionError('Test case failed: No error message displayed after submitting invalid credentials. Screenshot saved to tc002_failure.png')
        
        # Additionally, verify that we are still on the login page (no redirect)
        # The URL should still contain /login
        current_url = page.url
        if '/login' not in current_url:
            raise AssertionError(f'Test case failed: Unexpected redirect after invalid login. Current URL: {current_url}')
        
        await asyncio.sleep(1)  # Brief pause for observation
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())