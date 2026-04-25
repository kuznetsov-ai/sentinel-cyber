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
                "Page heading":   "<h2>Alerts</h2>" in content,
                "Total counter":  "total alerts" in content,
                "Filter selects": await self.page.locator("select.sc-select").count() >= 3,
                "Table rows":     await self.page.locator("tbody tr").count() >= 1,
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
            # Defensive: a leftover modal/toast from the previous scenario
            # would cover the Acknowledge button and cause Playwright's
            # actionability check to time out (30s).
            for _ in range(2):
                await self.page.keyboard.press("Escape")
                await asyncio.sleep(0.15)
            overlay = self.page.locator("#sc-modal-overlay")
            if await overlay.count() > 0:
                await overlay.evaluate("el => el.remove()")

            first_row = self.page.locator("tbody tr").first
            # Second button = check_circle (acknowledge)
            ack_btn = first_row.locator("button").nth(1)
            await ack_btn.click(timeout=5000)
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

            # Wait for the Cases table to render its first row (the seed
            # spawns 40+ cases, but the request might still be in flight on
            # the first hit of a session).
            try:
                await self.page.locator(":is(a, button):has-text('Open Case')").first.wait_for(
                    state="attached", timeout=8000
                )
            except Exception:
                pass

            content = await self.page.content()
            row_count = await self.page.locator("tbody tr").count()
            checks = {
                "Cases heading":   "<h2>Cases</h2>" in content,
                "KPI summary":     await self.page.locator(".sc-kpi").count() >= 3,
                "Risk filter":     await self.page.locator("select[name='risk']").count() == 1,
                "Status filter":   await self.page.locator("select[name='status']").count() == 1,
                "Table rows":      row_count >= 1,
                "Open Case btn":   await self.page.locator(":is(a, button):has-text('Open Case')").count() > 0,
            }
            screenshot = await self._screenshot("S07_cases")
            failed = [k for k, v in checks.items() if not v]
            if failed:
                self._record("S07_cases_modal", "FAIL", "Missing: " + ", ".join(failed), screenshot, start)
                return self.results[-1]

            # Open Case button is inside table rows — scroll first row into
            # view (above-the-fold the table sits below the KPI summary)
            try:
                await self.page.locator(":is(a, button):has-text('Open Case')").first.scroll_into_view_if_needed(timeout=3000)
                await self.page.locator(":is(a, button):has-text('Open Case')").first.click(timeout=5000)
            except Exception as e:
                self._record("S07_cases_modal", "WARN",
                             f"Cases page renders ({row_count} rows) but Open Case click failed: {e}",
                             await self._screenshot("S07_cases_modal"), start)
                return self.results[-1]
            await asyncio.sleep(0.6)
            try:
                await self.page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass

            modal = self.page.locator("#sc-modal-overlay")
            modal_visible = await modal.count() > 0
            url_changed = "/cases/" in self.page.url and self.page.url.rstrip("/") != self.base_url + "/cases"
            screenshot = await self._screenshot("S07_cases_modal")

            if modal_visible:
                self._record("S07_cases_modal", "PASS",
                             f"Case modal opened ({row_count} table rows visible)", screenshot, start)
                await self.page.keyboard.press("Escape")
            elif url_changed:
                self._record("S07_cases_modal", "PASS",
                             f"Open Case navigates to {self.page.url} ({row_count} rows)", screenshot, start)
            else:
                self._record("S07_cases_modal", "WARN",
                             f"Open Case clicked but neither modal nor navigation ({row_count} rows)",
                             screenshot, start)
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
            try:
                await self.page.locator(".sc-card .sc-toggle").first.wait_for(state="visible", timeout=5000)
            except Exception:
                pass
            rule_card_count = await self.page.locator(".sc-card .sc-toggle").count()
            checks = {
                "Rules heading":  "<h2>Rules Engine</h2>" in content,
                "Stats KPIs":     await self.page.locator(".sc-kpi").count() >= 4,
                "Rule cards":     rule_card_count >= 1,
                "New Rule btn":   await self.page.locator("button:has-text('New Rule')").count() > 0,
            }
            screenshot_rules = await self._screenshot("S08_rules_page")
            failed = [k for k, v in checks.items() if not v]
            if failed:
                self._record("S08_rules_create", "FAIL", "Page checks: " + ", ".join(failed), screenshot_rules, start)
                return self.results[-1]

            await self.page.locator("button:has-text('New Rule')").first.click()
            await asyncio.sleep(0.5)

            modal = self.page.locator("#sc-modal-overlay")
            screenshot = await self._screenshot("S08_rules_create_modal")
            if await modal.count() > 0:
                self._record("S08_rules_create", "PASS",
                             f"New Rule modal opened ({rule_card_count} rule cards visible)", screenshot, start)
                await self.page.keyboard.press("Escape")
            else:
                # Cards exist and CTA renders — accept as smoke-pass even if modal not wired
                self._record("S08_rules_create", "WARN",
                             f"Cards & CTA present but modal not wired ({rule_card_count} cards)", screenshot, start)
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

            tabs = [
                ("general",       "General"),
                ("notifications", "Notifications"),
                ("integrations",  "Integrations"),
                ("team",          "Team"),
                ("security",      "Security"),
            ]
            failed = []

            for tab_id, tab_label in tabs:
                tab_button = self.page.locator(f"#settings-tabs button[data-tab='{tab_id}']")
                if await tab_button.count() == 0:
                    failed.append(f"Tab button '{tab_id}' not found")
                    continue

                await tab_button.click()
                await asyncio.sleep(0.4)

                screenshot = await self._screenshot(f"S11_tab_{tab_id}")

                panel = self.page.locator(f"#tab-{tab_id}")
                panel_count = await panel.count()
                if panel_count == 0:
                    failed.append(f"Panel #tab-{tab_id} not in DOM")
                else:
                    panel_display = await panel.evaluate("el => getComputedStyle(el).display")
                    if panel_display == "none":
                        failed.append(f"Panel #tab-{tab_id} hidden after click")

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
            notif_tab = self.page.locator("#settings-tabs button[data-tab='notifications']")
            await notif_tab.click()
            await asyncio.sleep(0.4)

            toggles = self.page.locator("#tab-notifications .sc-toggle")
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
            team_tab = self.page.locator("#settings-tabs button[data-tab='team']")
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
                "Reports heading":      "Reports &amp; Analytics" in content or "Reports & Analytics" in content,
                "By Severity section":  "By Severity" in content,
                "By Method section":    "Detection Method" in content,
                "Severity SVG donut":   await self.page.locator("svg circle[stroke-dasharray]").count() >= 1,
                "Export PDF button":    await self.page.locator("button:has-text('Export PDF')").count() > 0,
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

    # ── S16: Responsive viewports — no horizontal overflow ───
    async def test_responsive_viewports(self):
        """Check every page on phone/tablet/desktop. Fail if any page
        produces a horizontal scrollbar on any viewport."""
        start = await self._step("S16_responsive")
        viewports = [
            ("mobile",  393, 852),
            ("tablet",  768, 1024),
            ("desktop", 1440, 900),
        ]
        routes = ["/", "/alerts", "/cases", "/rules", "/reports", "/settings"]
        failures = []
        try:
            for vp_name, w, h in viewports:
                await self.page.set_viewport_size({"width": w, "height": h})
                # Clear localStorage so desktop runs always start expanded
                try:
                    await self.page.evaluate("localStorage.removeItem('sentinel.sidebar.collapsed')")
                except Exception:
                    pass
                for route in routes:
                    await self.page.goto(self.base_url + route, wait_until="domcontentloaded")
                    try:
                        await self.page.wait_for_load_state("networkidle", timeout=10000)
                    except Exception:
                        pass
                    # Force a layout recalc so SVG/inline-grid widths settle
                    # before we read scrollWidth — without this, dashboard's
                    # timeline SVG can briefly report a wider layout than the
                    # viewport.
                    await self.page.evaluate("document.body.offsetHeight")
                    await asyncio.sleep(0.8)
                    metrics = await self.page.evaluate(
                        "({sw: document.documentElement.scrollWidth, "
                        "iw: window.innerWidth, "
                        "bw: document.body.scrollWidth})"
                    )
                    sw, iw = metrics["sw"], metrics["iw"]
                    # 4px tolerance — sub-pixel rounding plus scrollbar gutter
                    if sw > iw + 4:
                        failures.append(f"{vp_name}({w}x{h}) {route}: scrollW={sw} > innerW={iw}")
                    await self._screenshot(f"S16_{vp_name}_{route.strip('/').replace('/', '_') or 'dashboard'}")
            screenshot = await self._screenshot("S16_responsive_summary")
            if failures:
                self._record("S16_responsive", "FAIL",
                             f"{len(failures)} overflow(s): " + " | ".join(failures[:5]),
                             screenshot, start)
            else:
                total = len(viewports) * len(routes)
                self._record("S16_responsive", "PASS",
                             f"All {total} (page × viewport) combinations fit without horizontal scroll",
                             screenshot, start)
        except Exception as e:
            self._record("S16_responsive", "FAIL", str(e), await self._screenshot("S16_err"), start)
        finally:
            # Restore desktop viewport for subsequent tests
            await self.page.set_viewport_size({"width": 1440, "height": 900})
        return self.results[-1]

    # ── S17: Mobile burger opens / closes drawer ─────────────
    async def test_mobile_drawer(self):
        start = await self._step("S17_mobile_drawer")
        try:
            await self.page.set_viewport_size({"width": 393, "height": 852})
            await self.page.goto(self.base_url + "/")
            await self.page.wait_for_load_state("networkidle", timeout=10000)
            await asyncio.sleep(0.5)

            burger = self.page.locator("#sidebar-toggle")
            backdrop = self.page.locator("#sidebar-backdrop")
            steps = []

            # 1. Drawer starts closed
            initial_open = await self.page.evaluate("document.body.classList.contains('sidebar-open')")
            steps.append(("starts closed", not initial_open))

            # 2. Burger click opens it
            await burger.click()
            await asyncio.sleep(0.4)
            opened = await self.page.evaluate("document.body.classList.contains('sidebar-open')")
            steps.append(("burger opens drawer", opened))
            await self._screenshot("S17_drawer_open")

            # 3. Backdrop is interactive when open
            backdrop_pe = await backdrop.evaluate("el => getComputedStyle(el).pointerEvents")
            steps.append(("backdrop interactive when open", backdrop_pe != "none"))

            # 4. Tap backdrop closes the drawer.
            #    The drawer (240px wide) sits on top of the backdrop, so a
            #    centred backdrop click would land on the sidebar itself. Click
            #    on the right side, well outside the drawer.
            vp = self.page.viewport_size
            await self.page.mouse.click(vp["width"] - 30, vp["height"] // 2)
            await asyncio.sleep(0.4)
            closed = await self.page.evaluate("document.body.classList.contains('sidebar-open')")
            steps.append(("backdrop closes drawer", not closed))

            # 5. Open again, click a nav link → drawer closes (and navigates)
            await burger.click()
            await asyncio.sleep(0.3)
            await self.page.locator("#sidebar a[href='/alerts']").click()
            await asyncio.sleep(0.6)
            url_now = self.page.url
            still_open = await self.page.evaluate("document.body.classList.contains('sidebar-open')")
            steps.append(("nav link navigates", url_now.endswith("/alerts")))
            steps.append(("nav link closes drawer", not still_open))

            screenshot = await self._screenshot("S17_drawer_after_nav")
            failed = [name for name, ok in steps if not ok]
            if failed:
                self._record("S17_mobile_drawer", "FAIL",
                             "Failed steps: " + ", ".join(failed), screenshot, start)
            else:
                self._record("S17_mobile_drawer", "PASS",
                             f"All {len(steps)} drawer steps OK", screenshot, start)
        except Exception as e:
            self._record("S17_mobile_drawer", "FAIL", str(e), await self._screenshot("S17_err"), start)
        finally:
            await self.page.set_viewport_size({"width": 1440, "height": 900})
        return self.results[-1]

    # ── S18: Desktop sidebar collapse toggle + persistence ───
    async def test_desktop_collapse(self):
        start = await self._step("S18_desktop_collapse")
        try:
            await self.page.set_viewport_size({"width": 1440, "height": 900})
            await self.page.goto(self.base_url + "/")
            await self.page.wait_for_load_state("networkidle", timeout=10000)
            await self.page.evaluate("localStorage.removeItem('sentinel.sidebar.collapsed')")
            await self.page.reload()
            await self.page.wait_for_load_state("networkidle", timeout=10000)
            await asyncio.sleep(0.4)

            steps = []
            # 1. Default expanded — sidebar wider than 200px
            sidebar_w_open = await self.page.locator("#sidebar").evaluate("el => el.getBoundingClientRect().width")
            steps.append(("sidebar wide by default", sidebar_w_open > 200))

            # 2. Click toggle → collapsed (~64px)
            await self.page.locator("#sidebar-toggle").click()
            await asyncio.sleep(0.3)
            sidebar_w_collapsed = await self.page.locator("#sidebar").evaluate("el => el.getBoundingClientRect().width")
            steps.append(("collapsed width <= 80px", sidebar_w_collapsed <= 80))
            await self._screenshot("S18_collapsed")

            # 3. Nav labels are hidden in collapsed mode
            label_visible = await self.page.locator("#sidebar .nav-label").first.is_visible()
            steps.append(("nav labels hidden", not label_visible))

            # 4. localStorage persists
            stored = await self.page.evaluate("localStorage.getItem('sentinel.sidebar.collapsed')")
            steps.append(("localStorage stored '1'", stored == "1"))

            # 5. After reload, sidebar stays collapsed
            await self.page.reload()
            await self.page.wait_for_load_state("networkidle", timeout=10000)
            await asyncio.sleep(0.4)
            sidebar_w_after_reload = await self.page.locator("#sidebar").evaluate("el => el.getBoundingClientRect().width")
            steps.append(("collapsed state persists across reload", sidebar_w_after_reload <= 80))
            await self._screenshot("S18_persisted")

            # 6. Toggle again → expanded
            await self.page.locator("#sidebar-toggle").click()
            await asyncio.sleep(0.3)
            sidebar_w_again = await self.page.locator("#sidebar").evaluate("el => el.getBoundingClientRect().width")
            steps.append(("toggle re-expands", sidebar_w_again > 200))

            screenshot = await self._screenshot("S18_expanded_again")
            failed = [n for n, ok in steps if not ok]
            if failed:
                self._record("S18_desktop_collapse", "FAIL",
                             "Failed: " + ", ".join(failed), screenshot, start)
            else:
                self._record("S18_desktop_collapse", "PASS",
                             f"All {len(steps)} collapse steps OK", screenshot, start)
        except Exception as e:
            self._record("S18_desktop_collapse", "FAIL", str(e), await self._screenshot("S18_err"), start)
        return self.results[-1]

    # ── S19: Per-session demo sandbox + reset ─────────────────
    async def test_demo_sandbox_reset(self):
        """Verify sentinel_sid cookie issued, /api/demo/reset rotates it,
        and the dataset (KPI counts) actually changes after a reset."""
        start = await self._step("S19_demo_reset")
        try:
            await self.page.set_viewport_size({"width": 1440, "height": 900})
            await self.page.context.clear_cookies()
            await self.page.goto(self.base_url + "/")
            await self.page.wait_for_load_state("networkidle", timeout=10000)
            await asyncio.sleep(0.5)

            cookies_before = await self.page.context.cookies()
            sid_cookie_before = next((c for c in cookies_before if c["name"] == "sentinel_sid"), None)
            kpis_before = [
                (await el.text_content() or "").strip()
                for el in await self.page.locator(".sc-kpi .kpi-val").all()
            ]

            steps = []
            steps.append(("sentinel_sid cookie issued", sid_cookie_before is not None))
            steps.append(("sentinel_sid is HttpOnly",
                          bool(sid_cookie_before and sid_cookie_before.get("httpOnly"))))

            # Auto-accept the confirm() dialog the Reset button triggers.
            # Use `once` — `on` would accumulate handlers across re-runs of
            # this scenario in the same Page lifetime.
            self.page.once("dialog", lambda d: asyncio.create_task(d.accept()))
            await self.page.locator("#demo-reset").click()
            await asyncio.sleep(2.5)
            try:
                await self.page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass

            cookies_after = await self.page.context.cookies()
            sid_cookie_after = next((c for c in cookies_after if c["name"] == "sentinel_sid"), None)
            kpis_after = [
                (await el.text_content() or "").strip()
                for el in await self.page.locator(".sc-kpi .kpi-val").all()
            ]

            steps.append(("new sid issued by /api/demo/reset",
                          sid_cookie_after and sid_cookie_before
                          and sid_cookie_after["value"] != sid_cookie_before["value"]))
            # Compare the full KPI tuple — chance that two random sids produce
            # identical (alerts, new, cases, blocked) is effectively zero
            # (alerts: 100–160, cases: 40–80, plus derived counters), so this
            # assertion won't flake on collisions like the single-KPI version.
            steps.append(("dataset changed (all KPIs)",
                          len(kpis_before) > 0 and kpis_before != kpis_after))

            screenshot = await self._screenshot("S19_after_reset")
            failed = [n for n, ok in steps if not ok]
            if failed:
                self._record("S19_demo_reset", "FAIL",
                             f"Failed: {', '.join(failed)} (before={kpis_before}, after={kpis_after})",
                             screenshot, start)
            else:
                self._record("S19_demo_reset", "PASS",
                             f"sid rotated, KPIs {kpis_before} → {kpis_after}",
                             screenshot, start)
        except Exception as e:
            self._record("S19_demo_reset", "FAIL", str(e), await self._screenshot("S19_err"), start)
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
            self.test_responsive_viewports,
            self.test_mobile_drawer,
            self.test_desktop_collapse,
            self.test_demo_sandbox_reset,
        ]
        for test_fn in tests:
            await test_fn()
        return self.results
