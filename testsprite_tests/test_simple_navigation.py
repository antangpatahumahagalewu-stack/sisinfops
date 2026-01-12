import asyncio
from playwright.async_api import async_playwright, Error

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        page = await context.new_page()
        
        # Navigate to the target URL
        response = await page.goto("http://localhost:3000/id", wait_until="commit", timeout=10000)
        print(f"Navigation successful, status: {response.status}")
        
        # Wait for load state
        await page.wait_for_load_state("domcontentloaded", timeout=3000)
        print("Page loaded")
        
        # Check title or some element to confirm page is up
        title = await page.title()
        print(f"Page title: {title}")
        
        await asyncio.sleep(2)
        print("Test completed successfully")
        return True
    
    except Exception as e:
        print(f"Test failed with error: {e}")
        return False
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())