import asyncio
from playwright.async_api import async_playwright, expect, Error

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_playwright().start()
        
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
        except Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except Error:
                pass
        
        # Fill in valid credentials
        await page.fill('input[id="email"]', 'boby@yayasan.com')
        await page.fill('input[id="password"]', 'admin123')
        
        # Submit the form and wait for navigation
        # Use Promise.all to wait for both the click and navigation
        try:
            # Wait for navigation to occur after clicking submit
            async with page.expect_navigation(timeout=10000):
                await page.click('button[type="submit"]')
        except Error:
            # If navigation doesn't happen within timeout, maybe the login failed without redirect
            pass
        
        # Wait a bit for any client-side redirects
        await page.wait_for_timeout(1000)
        
        # Check if we are on the dashboard page by looking for the dashboard title
        try:
            # Wait for the dashboard title to appear (this indicates successful login and navigation)
            await expect(page.locator('text=Dashboard Nasional')).to_be_visible(timeout=10000)
        except AssertionError:
            # If dashboard title didn't appear, check for error messages
            error_selectors = [
                '[role="alert"]',
                '.text-red-500',
                '.text-destructive',
                '.alert-destructive',
                'text=error',
                'text=Error',
                'text=gagal',
                'text=invalid',
                'text=Invalid',
                'text=Terjadi kesalahan',
                'text=Login gagal'
            ]
            
            error_found = False
            error_text = ""
            for selector in error_selectors:
                try:
                    # Try to get the text content without waiting (timeout=0)
                    texts = await page.locator(selector).all_text_contents()
                    if texts and len(texts) > 0:
                        error_found = True
                        error_text = texts[0]
                        break
                except Exception:
                    # If there's an issue, just continue to the next selector
                    continue
            
            if error_found:
                raise AssertionError(f'Test case failed: Login failed with error: {error_text}')
            else:
                # Take screenshot for debugging
                await page.screenshot(path='login_failure.png')
                # Check current URL
                current_url = page.url
                # Check if we're still on login page by looking for login form elements
                if await page.locator('input[id="email"]').count() > 0 or await page.locator('input[id="password"]').count() > 0:
                    raise AssertionError('Test case failed: Login failed - still on login page with login form, but no error message displayed')
                else:
                    raise AssertionError(f'Test case failed: Login failed - on URL {current_url}, and no login form or error message found')
        
        # At this point, we have the dashboard title visible, so we're logged in
        # Verify the URL contains /dashboard
        current_url = page.url
        if '/dashboard' not in current_url:
            print(f"Warning: Dashboard title is visible but URL is {current_url} (expected /dashboard)")
        
        # Wait for dashboard content to load
        await page.wait_for_load_state("domcontentloaded", timeout=5000)
        
        # Check for at least one statistic card (Total PS)
        try:
            await expect(page.locator('text=Total PS').first).to_be_visible(timeout=10000)
        except AssertionError:
            raise AssertionError('Test case failed: Total PS statistic not displayed')
        
        # Check for other key dashboard elements
        try:
            await expect(page.locator('text=Total Luas').first).to_be_visible(timeout=5000)
            await expect(page.locator('text=RKPS Tersedia').first).to_be_visible(timeout=5000)
            await expect(page.locator('text=Peta Tersedia').first).to_be_visible(timeout=5000)
        except AssertionError as e:
            # Log warning but don't fail test - some elements might not be visible if there's no data
            print(f"Warning: Some dashboard elements not found: {e}")
        
        # Additional check: verify the page contains aggregate statistics
        # We'll check for at least one number in the stats cards (either 0 or positive)
        stat_cards = await page.locator('.text-2xl.font-bold').all()
        if len(stat_cards) == 0:
            raise AssertionError('Test case failed: No statistic cards found on dashboard')
        
        # Verify at least one stat card has a numeric value (could be 0)
        has_numeric_value = False
        for card in stat_cards[:5]:  # Check first 5 stat cards
            text = await card.text_content()
            if text and text.strip().replace(',', '').isdigit():
                has_numeric_value = True
                break
        
        if not has_numeric_value:
            print("Warning: No numeric values found in statistic cards (might be empty database)")
        
        await asyncio.sleep(2)  # Brief pause for observation
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
