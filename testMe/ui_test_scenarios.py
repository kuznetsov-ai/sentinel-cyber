"""
Sentinel Cyber — UI Test Scenarios
Tests all tabs, all buttons, all interactive elements.
"""
from __future__ import annotations

import asyncio
from scenarios.base import BaseScenario, StepResult


class SentinelCyberScenarios(BaseScenario):
    OUTPUT_SUBDIR = "sentinel-cyber"

    # ── S01: Dashboard loads with KPI cards ───────────────────
    async def test_dashboard_loads(self):
        start = await self._step("S01_dashboard")
        try:
            await self.page.goto(self.base_url + "/")
            await self.page.wait_for_load_state("networkidle", timeout=10000)
            await asyncio.sleep(1)
            screenshot = await self._screenshot("S01_dashboard")

            content = await self.page.content()
            checks = {
                "KPI Alerts":    any(x in content for x in ["1,284", "1284", "Total Alerts"]),
                "KPI Cases":     "Active Cases" in content or "42" in content,
                "KPI Blocked":   "Blocked" in content,
                "Timeline":      "Suspicious Activity" in content or "Timeline" in content,
                "Sidebar nav":   "Dashboard" in content and "Alerts" in content,
            }
            failed = [k for k, v in checks.items() if not v]
            if failed:
                self._record("S01_dashboard", "FAIL", "Missing: " + ", ".join(failed), screenshot, start)
            else:
                self._record("S01_dashboard", "PASS", f"All {len(checks)} checks passed", screenshot, start)
        except Exception as e:
            self._record("S01_dashboard", "FAIL", str(e), await self._screenshot("S01_err"), start)
        return self.results[-1]

    # ── S02: Sidebar links navigate correctly ─────────────────
    async def test_sidebar_navigation(self):
        start = await self._step("S02_sidebar_nav")
        try:
            nav_tests = [
                ("/alerts",   "Alerts"),
                ("/cases",    "Cases"),
                ("/rules",    "Rules Engine"),
                ("/reports",  "Reports"),
                ("/settings", "Settings"),
                ("/",         "Dashboard"),
            ]
            failed = []
            for route, expected_text in nav_tests:
                await self.page.goto(self.base_url + route)
                await self.page.wait_for_load_state("networkidle", timeout=8000)
                content = await self.page.content()
                if expected_text not in content:
                    failed.append(f"{route} missing '{expected_text}'")

            screenshot = await self._screenshot("S02_sidebar_nav")
            if failed:
                self._record("S02_sidebar_nav", "FAIL", "; ".join(failed), screenshot, start)
            else:
                self._record("S02_sidebar_nav", "PASS", f"All {len(nav_tests)} routes load correct content", screenshot, start)
        except Exception as e:
            self._record("S02_sidebar_nav", "FAIL", str(e), await self._screenshot("S02_err"), start)
        return self.results[-1]

    # ── S03: Alerts page — filters + table visible ────────────
    async def test_alerts_page(self):
        start = await self._step("S03_alerts")
        try:
            await self.page.goto(self.base_url + "/alerts")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            content = await self.page.content()
            checks = {
                "Page heading":   "Alerts" in content,
                "Active badge":   "1,284" in content or "Active" in content,
                "Filter selects": await self.page.locator("select").count() >= 2,
                "Table rows":     await self.page.locator("tbody tr").count() >= 5,
                "Export button":  await self.page.locator("button:has-text('Export')").count() > 0,
            }
            screenshot = await self._screenshot("S03_alerts")
            failed = [k for k, v in checks.items() if not v]
            if failed:
                self._record("S03_alerts", "FAIL", "Missing: " + ", ".join(failed), screenshot, start)
            else:
                rows = await self.page.locator("tbody tr").count()
                self._record("S03_alerts", "PASS", f"Page OK, {rows} table rows visible", screenshot, start)
        except Exception as e:
            self._record("S03_alerts", "FAIL", str(e), await self._screenshot("S03_err"), start)
        return self.results[-1]

    # ── S04: Alert View button opens modal ────────────────────
    async def test_alert_view_modal(self):
        start = await self._step("S04_alert_modal")
        try:
            await self.page.goto(self.base_url + "/alerts")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            # Click first visibility (View) button in table
            view_btn = self.page.locator("tbody tr").first.locator("button").first
            await view_btn.click()
            await asyncio.sleep(0.5)

            modal = self.page.locator("#sc-modal-overlay")
            modal_visible = await modal.count() > 0
            screenshot = await self._screenshot("S04_alert_modal")

            if not modal_visible:
                self._record("S04_alert_modal", "FAIL", "Modal did not appear after View click", screenshot, start)
            else:
                modal_text = await modal.text_content()
                has_alert_id = "AL-" in modal_text or "Alert" in modal_text
                self._record("S04_alert_modal", "PASS" if has_alert_id else "WARN",
                             "Modal opened" + (", alert ID found" if has_alert_id else ", no alert ID"), screenshot, start)

            # Close modal with ESC
            await self.page.keyboard.press("Escape")
            await asyncio.sleep(0.3)
        except Exception as e:
            self._record("S04_alert_modal", "FAIL", str(e), await self._screenshot("S04_err"), start)
        return self.results[-1]

    # ── S05: Alert Acknowledge changes status ─────────────────
    async def test_alert_acknowledge(self):
        start = await self._step("S05_acknowledge")
        try:
            await self.page.goto(self.base_url + "/alerts")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            first_row = self.page.locator("tbody tr").first
            # Second button = check_circle (acknowledge)
            ack_btn = first_row.locator("button").nth(1)
            await ack_btn.click()
            await asyncio.sleep(0.5)

            screenshot = await self._screenshot("S05_acknowledge")

            # Check toast appeared
            toast = self.page.locator("div").filter(has_text="acknowledged").last
            toast_visible = await toast.count() > 0

            # Check row opacity changed
            opacity = await first_row.evaluate("el => el.style.opacity")

            if toast_visible or opacity == "0.7":
                self._record("S05_acknowledge", "PASS", f"Row acknowledged: opacity={opacity}, toast={toast_visible}", screenshot, start)
            else:
                self._record("S05_acknowledge", "WARN", "Acknowledge clicked but no visible feedback", screenshot, start)
        except Exception as e:
            self._record("S05_acknowledge", "FAIL", str(e), await self._screenshot("S05_err"), start)
        return self.results[-1]

    # ── S06: Alert Dismiss removes row ────────────────────────
    async def test_alert_dismiss(self):
        start = await self._step("S06_dismiss")
        try:
            await self.page.goto(self.base_url + "/alerts")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            initial_count = await self.page.locator("tbody tr").count()

            # Third button = cancel (dismiss)
            first_row = self.page.locator("tbody tr").first
            dismiss_btn = first_row.locator("button").nth(2)
            await dismiss_btn.click()
            await asyncio.sleep(0.5)

            new_count = await self.page.locator("tbody tr").count()
            screenshot = await self._screenshot("S06_dismiss")

            if new_count < initial_count:
                self._record("S06_dismiss", "PASS", f"Row removed: {initial_count} → {new_count} rows", screenshot, start)
            else:
                self._record("S06_dismiss", "WARN", f"Row count unchanged: {initial_count}", screenshot, start)
        except Exception as e:
            self._record("S06_dismiss", "FAIL", str(e), await self._screenshot("S06_err"), start)
        return self.results[-1]

    # ── S07: Cases page — Open Case modal ────────────────────
    async def test_cases_open_modal(self):
        start = await self._step("S07_cases_modal")
        try:
            await self.page.goto(self.base_url + "/cases")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            content = await self.page.content()
            checks = {
                "Cases heading": "Cases" in content,
                "Table exists":  await self.page.locator("tbody tr").count() >= 3,
                "Open Case btn": await self.page.locator("button:has-text('Open Case')").count() > 0,
            }
            screenshot = await self._screenshot("S07_cases")
            failed = [k for k, v in checks.items() if not v]
            if failed:
                self._record("S07_cases_modal", "FAIL", "Missing: " + ", ".join(failed), screenshot, start)
                return self.results[-1]

            # Click first Open Case button
            await self.page.locator("button:has-text('Open Case')").first.click()
            await asyncio.sleep(0.5)

            modal = self.page.locator("#sc-modal-overlay")
            modal_visible = await modal.count() > 0
            screenshot = await self._screenshot("S07_cases_modal")

            if modal_visible:
                self._record("S07_cases_modal", "PASS", "Case modal opened successfully", screenshot, start)
                await self.page.keyboard.press("Escape")
            else:
                self._record("S07_cases_modal", "FAIL", "Modal did not appear", screenshot, start)
        except Exception as e:
            self._record("S07_cases_modal", "FAIL", str(e), await self._screenshot("S07_err"), start)
        return self.results[-1]

    # ── S08: Rules Engine — Create Rule modal ─────────────────
    async def test_rules_create_modal(self):
        start = await self._step("S08_rules_create")
        try:
            await self.page.goto(self.base_url + "/rules")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            content = await self.page.content()
            checks = {
                "Rules heading": "Rules Engine" in content or "Rules" in content,
                "Rule cards":    await self.page.locator("[class*='glass-card'], [class*='glass_card']").count() >= 4,
                "Create btn":    await self.page.locator("button:has-text('Create Rule'), button:has-text('Deploy New Rule')").count() > 0,
            }
            screenshot_rules = await self._screenshot("S08_rules_page")
            failed = [k for k, v in checks.items() if not v]
            if failed:
                self._record("S08_rules_create", "FAIL", "Page checks: " + ", ".join(failed), screenshot_rules, start)
                return self.results[-1]

            await self.page.locator("button:has-text('Create Rule'), button:has-text('Deploy New Rule')").first.click()
            await asyncio.sleep(0.5)

            modal = self.page.locator("#sc-modal-overlay")
            screenshot = await self._screenshot("S08_rules_create_modal")
            if await modal.count() > 0:
                self._record("S08_rules_create", "PASS", "Create Rule modal opened", screenshot, start)
                await self.page.keyboard.press("Escape")
            else:
                self._record("S08_rules_create", "FAIL", "Modal did not appear", screenshot, start)
        except Exception as e:
            self._record("S08_rules_create", "FAIL", str(e), await self._screenshot("S08_err"), start)
        return self.results[-1]

    # ── S09: Rules Engine — Toggle switch ─────────────────────
    async def test_rules_toggle(self):
        start = await self._step("S09_rules_toggle")
        try:
            await self.page.goto(self.base_url + "/rules")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            toggle = self.page.locator("[data-sc-t='1']").first
            if await toggle.count() == 0:
                self._record("S09_rules_toggle", "WARN", "No toggle found on rules page", await self._screenshot("S09_notoggle"), start)
                return self.results[-1]

            before_attr = await toggle.get_attribute("data-active")
            await toggle.click()
            await asyncio.sleep(0.4)
            after_attr = await toggle.get_attribute("data-active")
            screenshot = await self._screenshot("S09_rules_toggle")

            if before_attr != after_attr:
                self._record("S09_rules_toggle", "PASS", f"Toggle changed: {before_attr} → {after_attr}", screenshot, start)
            else:
                self._record("S09_rules_toggle", "WARN", "Toggle clicked but data-active unchanged", screenshot, start)
        except Exception as e:
            self._record("S09_rules_toggle", "FAIL", str(e), await self._screenshot("S09_err"), start)
        return self.results[-1]

    # ── S10: Settings — General tab content ───────────────────
    async def test_settings_general_tab(self):
        start = await self._step("S10_settings_general")
        try:
            await self.page.goto(self.base_url + "/settings")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            content = await self.page.content()
            checks = {
                "System Settings section": "System Settings" in content,
                "Alert Thresholds section": "Alert Thresholds" in content,
                "Dashboard name input":    await self.page.locator("input[value*='TAF'], input[value*='Monitor']").count() > 0,
                "Save Changes button":     await self.page.locator("button:has-text('Save Changes')").count() > 0,
                "Tabs visible":            "Notifications" in content and "Security" in content,
            }
            screenshot = await self._screenshot("S10_settings_general")
            failed = [k for k, v in checks.items() if not v]
            if failed:
                self._record("S10_settings_general", "FAIL", "Missing: " + ", ".join(failed), screenshot, start)
            else:
                self._record("S10_settings_general", "PASS", "General tab: all sections present", screenshot, start)
        except Exception as e:
            self._record("S10_settings_general", "FAIL", str(e), await self._screenshot("S10_err"), start)
        return self.results[-1]

    # ── S11: Settings — Switch all 5 tabs ─────────────────────
    async def test_settings_all_tabs(self):
        start = await self._step("S11_settings_tabs")
        try:
            await self.page.goto(self.base_url + "/settings")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            tabs = ["General", "Notifications", "Integrations", "Team", "Security"]
            failed = []

            for tab_name in tabs:
                tab_link = self.page.locator(f"header nav a:has-text('{tab_name}')")
                if await tab_link.count() == 0:
                    failed.append(f"Tab '{tab_name}' not found")
                    continue

                await tab_link.click()
                await asyncio.sleep(0.4)

                screenshot = await self._screenshot(f"S11_tab_{tab_name.lower()}")

                # Check that some content changed / panel is visible
                # Original tabs use data-tab-section; generated tabs use data-tab-panel
                generated_tabs = ["Integrations", "Security"]
                if tab_name in generated_tabs:
                    panel = self.page.locator(f"[data-tab-panel='{tab_name}']")
                    attr = "data-tab-panel"
                else:
                    panel = self.page.locator(f"[data-tab-section='{tab_name}']").first
                    attr = "data-tab-section"

                panel_count = await panel.count()
                if panel_count == 0:
                    failed.append(f"Panel for '{tab_name}' ({attr}) not in DOM")
                else:
                    panel_display = await panel.evaluate("el => el.style.display")
                    if panel_display == "none":
                        failed.append(f"Panel '{tab_name}' hidden after click (display=none)")

            screenshot_final = await self._screenshot("S11_settings_tabs_final")
            if failed:
                self._record("S11_settings_tabs", "FAIL", "; ".join(failed), screenshot_final, start)
            else:
                self._record("S11_settings_tabs", "PASS", f"All {len(tabs)} settings tabs switched correctly", screenshot_final, start)
        except Exception as e:
            self._record("S11_settings_tabs", "FAIL", str(e), await self._screenshot("S11_err"), start)
        return self.results[-1]

    # ── S12: Settings — Toggles in Notifications tab ──────────
    async def test_settings_toggles(self):
        start = await self._step("S12_settings_toggles")
        try:
            await self.page.goto(self.base_url + "/settings")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            # Switch to Notifications tab
            notif_tab = self.page.locator("header nav a:has-text('Notifications')")
            await notif_tab.click()
            await asyncio.sleep(0.4)

            toggles = self.page.locator("[data-sc-t='1']")
            count = await toggles.count()
            screenshot = await self._screenshot("S12_settings_toggles")

            if count == 0:
                self._record("S12_settings_toggles", "WARN", "No initialized toggles found in Notifications tab", screenshot, start)
                return self.results[-1]

            # Click first toggle and verify state changes
            first_toggle = toggles.first
            before = await first_toggle.get_attribute("data-active")
            await first_toggle.click()
            await asyncio.sleep(0.3)
            after = await first_toggle.get_attribute("data-active")

            screenshot2 = await self._screenshot("S12_settings_toggles_after")
            if before != after:
                self._record("S12_settings_toggles", "PASS", f"Toggle works: {before} → {after}, {count} total toggles", screenshot2, start)
            else:
                self._record("S12_settings_toggles", "WARN", f"Toggle state unchanged: {before}", screenshot2, start)
        except Exception as e:
            self._record("S12_settings_toggles", "FAIL", str(e), await self._screenshot("S12_err"), start)
        return self.results[-1]

    # ── S13: Settings — Save Changes shows toast ──────────────
    async def test_settings_save(self):
        start = await self._step("S13_settings_save")
        try:
            await self.page.goto(self.base_url + "/settings")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            save_btn = self.page.locator("button:has-text('Save Changes')").first
            if await save_btn.count() == 0:
                self._record("S13_settings_save", "FAIL", "Save Changes button not found", await self._screenshot("S13_nosave"), start)
                return self.results[-1]

            await save_btn.click()
            await asyncio.sleep(0.5)

            screenshot = await self._screenshot("S13_settings_save")
            # Toast should appear
            toast = self.page.locator("div").filter(has_text="Changes saved")
            toast_visible = await toast.count() > 0

            if toast_visible:
                self._record("S13_settings_save", "PASS", "Toast appeared after Save Changes", screenshot, start)
            else:
                self._record("S13_settings_save", "WARN", "Save clicked but toast not detected", screenshot, start)
        except Exception as e:
            self._record("S13_settings_save", "FAIL", str(e), await self._screenshot("S13_err"), start)
        return self.results[-1]

    # ── S14: Settings — Invite Member modal ───────────────────
    async def test_settings_invite_member(self):
        start = await self._step("S14_invite")
        try:
            await self.page.goto(self.base_url + "/settings")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(0.8)

            # Switch to Team tab
            team_tab = self.page.locator("header nav a:has-text('Team')")
            await team_tab.click()
            await asyncio.sleep(0.4)

            invite_btn = self.page.locator("button:has-text('Invite Member')")
            if await invite_btn.count() == 0:
                self._record("S14_invite", "FAIL", "Invite Member button not found", await self._screenshot("S14_noinvite"), start)
                return self.results[-1]

            await invite_btn.click()
            await asyncio.sleep(0.4)

            modal = self.page.locator("#sc-modal-overlay")
            screenshot = await self._screenshot("S14_invite_modal")
            if await modal.count() > 0:
                email_field = modal.locator("input[type='email']")
                has_email = await email_field.count() > 0
                self._record("S14_invite", "PASS", f"Invite modal opened, email field: {has_email}", screenshot, start)
                await self.page.keyboard.press("Escape")
            else:
                self._record("S14_invite", "FAIL", "Modal did not appear", screenshot, start)
        except Exception as e:
            self._record("S14_invite", "FAIL", str(e), await self._screenshot("S14_err"), start)
        return self.results[-1]

    # ── S15: Reports page renders all charts ──────────────────
    async def test_reports_page(self):
        start = await self._step("S15_reports")
        try:
            await self.page.goto(self.base_url + "/reports")
            await self.page.wait_for_load_state("networkidle", timeout=8000)
            await asyncio.sleep(1)

            content = await self.page.content()
            checks = {
                "Reports heading":     "Reports" in content or "Analytics" in content,
                "Alerts by Day":       "Alerts by Day" in content or "Alerts By Day" in content,
                "Risk Level donut":    "Risk Level" in content or "Cases by Risk" in content,
                "Detection Rate":      "Detection Rate" in content or "Detection" in content,
                "Recent Reports list": "Weekly Fraud Summary" in content or "PDF" in content,
            }
            screenshot = await self._screenshot("S15_reports")
            failed = [k for k, v in checks.items() if not v]
            if failed:
                self._record("S15_reports", "FAIL", "Missing: " + ", ".join(failed), screenshot, start)
            else:
                self._record("S15_reports", "PASS", "All report sections visible", screenshot, start)
        except Exception as e:
            self._record("S15_reports", "FAIL", str(e), await self._screenshot("S15_err"), start)
        return self.results[-1]

    # ── run_all ────────────────────────────────────────────────
    async def run_all(self, only=None, random_n=None) -> list[StepResult]:
        tests = [
            self.test_dashboard_loads,
            self.test_sidebar_navigation,
            self.test_alerts_page,
            self.test_alert_view_modal,
            self.test_alert_acknowledge,
            self.test_alert_dismiss,
            self.test_cases_open_modal,
            self.test_rules_create_modal,
            self.test_rules_toggle,
            self.test_settings_general_tab,
            self.test_settings_all_tabs,
            self.test_settings_toggles,
            self.test_settings_save,
            self.test_settings_invite_member,
            self.test_reports_page,
        ]
        for test_fn in tests:
            await test_fn()
        return self.results
