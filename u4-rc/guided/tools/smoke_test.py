"""End-to-end test of the guided activity in a real browser, against tools/gas_sim.js (the real Code.gs).

Plays the whole activity as one student: runs the simulator where a step asks for it, answers every step
(a few of them wrong first, with hints, and one "show solution"), then checks the score on the page
against an independent count and against what reached the sheet. Also: resume after reload, offline queue,
duplicates, a second student, and screenshots for the visual review.

usage:  python3 -m http.server 8765 --bind 127.0.0.1   (in the simulator folder)
        node guided/tools/gas_sim.js 8766
        python3 guided/tools/smoke_test.py [screenshots folder]
"""
import json, sys, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765/guided.html"
GAS = "http://127.0.0.1:8766"
SHOTS = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/guided_shots"); SHOTS.mkdir(parents=True, exist_ok=True)
CONFIG = "window.GUIDED_CONFIG = { endpoint: '%s/', wrongCost: 1, minSolved: 1, revealAfterWrong: 3 };" % GAS
fails = []
def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)
def state(): return json.loads(urllib.request.urlopen(GAS + "/__state").read())
def gas(path): urllib.request.urlopen(GAS + path).read()

def steps_of(page, name):
    return page.evaluate("""(name) => { const C = window.GuidedContent; const A = C.build(C.makePersonal(name));
      return A.stations.flatMap(st => st.steps.map(sp => ({ id: sp.id, type: sp.type, pts: sp.pts, station: st.id, expected: sp.expected,
        correct: sp.options ? sp.options.findIndex(o => o.correct) : -1, hints: (sp.hints || []).map(h => h.cost), nopts: sp.options ? sp.options.length : 0 }))); }""", name)

def play_student(page, name, plan, shots=False):
    """plan: {step id: {'wrong': n, 'hints': n, 'reveal': bool}}. Returns the score this plan should get."""
    first, last = name.split(" ", 1)
    page.fill("#first", first); page.fill("#last", last)
    page.fill("#phone", "12345"); page.click("[data-act=start]")
    check("טלפון" in page.inner_text("#name-err"), "a bad phone number is refused")
    page.fill("#phone", "052-765 4321"); page.click("[data-act=start]")
    steps = steps_of(page, name)
    want = 0
    seen_station = None
    def one(sp):
        nonlocal want, seen_station
        page.wait_for_selector("#step-current[data-step='%s']" % sp["id"], timeout=8000)
        if shots and sp["station"] != seen_station:
            seen_station = sp["station"]; page.wait_for_timeout(500); page.screenshot(path=str(SHOTS / f"station_{sp['station']}_start.png"))
        do = plan.get(sp["id"], {})
        if sp["type"] == "info":
            page.click("[data-act=info-ok]"); return
        if sp["type"] == "sim":
            page.click("#sim-play"); page.wait_for_selector("#step-current.solved", timeout=9000)
            if shots: page.screenshot(path=str(SHOTS / f"{sp['id']}_played.png"))
            page.click("[data-act=continue]"); return
        hints = do.get("hints", 0)
        for _ in range(hints): page.click("[data-act=hint]")
        wrong = do.get("wrong", 0)
        if sp["type"] == "num":
            for k in range(wrong):
                page.fill("#ans", str(round(sp["expected"] * 3 + 7 + k, 2))); page.click("[data-act=check]")
                page.wait_for_selector(".feedback.bad")
            if shots and (hints or wrong): page.screenshot(path=str(SHOTS / f"{sp['id']}_hints_wrong.png"))
            if do.get("reveal"):
                page.click("[data-act=reveal]"); page.click("[data-act=reveal]")
                earned = 0
            else:
                page.fill("#ans", f"{sp['expected']:.2f}"); page.press("#ans", "Enter")
                earned = max(1, sp["pts"] - sum(sp["hints"][:hints]) - wrong)
        else:
            wrong_opts = [j for j in range(sp["nopts"]) if j != sp["correct"]][:wrong]
            for j in wrong_opts: page.click(f".opt[data-opt='{j}']")
            page.click(f".opt[data-opt='{sp['correct']}']")
            earned = max(1, sp["pts"] - len(wrong_opts))
        try:
            page.wait_for_selector("#step-current.solved", timeout=5000)
        except Exception:
            page.screenshot(path=str(SHOTS / "stuck.png")); print("STUCK at", sp, "| feedback:", page.inner_text("#feedback")); raise
        want += earned
        page.wait_for_timeout(700)   # the answer was sent with Enter: the card must still be there, not skipped
        if not page.query_selector("#step-current.solved"): raise RuntimeError("feedback was skipped at " + sp["id"])
        if shots and sp["id"] in ("s3-max", "s4-3a", "s5-hpa", "s3-time"): page.screenshot(path=str(SHOTS / f"{sp['id']}_solved.png"))
        page.click("[data-act=continue]")

    for i, sp in enumerate(steps):
        one(sp)
        if i + 1 < len(steps) and steps[i + 1]["station"] != sp["station"]:
            page.wait_for_selector("[data-act=next-station]"); page.click("[data-act=next-station]")
    return want, steps

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel="chrome", headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="he-IL")
    ctx.route("**/guided/config.js", lambda r: r.fulfill(body=CONFIG, content_type="application/javascript"))
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(BASE); page.wait_for_selector("#first")
    page.wait_for_timeout(700); page.screenshot(path=str(SHOTS / "welcome.png"))
    page.click("[data-act=start]")
    check(page.inner_text("#name-err") != "", "empty name is refused")

    plan = {"s1-tau": {"wrong": 1}, "s3-max": {"hints": 2, "wrong": 1}, "s3-15": {"hints": 3, "wrong": 3, "reveal": True}, "s3-shape": {"wrong": 2},
            "s4-3a": {"hints": 1}, "s5-lpmax": {"hints": 2}, "s5-check": {"wrong": 1}}
    name = "דנה לוי"
    want, steps = play_student(page, name, plan, shots=True)
    total = sum(s["pts"] for s in steps)
    page.click("[data-act=finish]"); page.wait_for_selector(".final-score")
    shown = int(page.inner_text(".final-score b"))
    check(shown == want, f"score on the page {shown} = independent count {want} (of {total})")
    page.wait_for_function("document.getElementById('submit-state').textContent.includes('התקבלה')", timeout=15000)
    page.wait_for_timeout(400); page.screenshot(path=str(SHOTS / "final.png"), full_page=True)

    st = state()["sheets"]
    sub, rows = st["הגשות"], st["צעדים"]
    check(len(sub) == 2, f"one submission row ({len(sub) - 1})")
    r = sub[1]
    check(r[2] == name and r[5] == "הוגש" and r[6] == want and r[7] == total, f"submission row: {r[2]}, {r[5]}, {r[6]}/{r[7]}")
    check(r[3] == "'0527654321", f"phone stored as text digits: {r[3]}")
    scored = [x for x in steps if x["type"] != "info"]
    check(len(rows) - 1 == len(scored), f"step rows {len(rows) - 1} = non-reading steps {len(scored)}")
    check(sum(x[11] for x in rows[1:]) == want, "points in the step rows add up to the score")
    rv = [x for x in rows[1:] if x[15] == "s3-15"][0]
    check(rv[10] == 1 and rv[11] == 0 and rv[8] == 3 and rv[9] == 3, f"revealed step recorded: wrong={rv[8]} hints={rv[9]} points={rv[11]}")
    check(len(st["ניתוח שלבים"]) - 1 == len(scored), "analysis sheet has a row per step")
    check(len(st["מיומנויות"]) > 3, f"skills sheet built ({len(st['מיומנויות']) - 1} rows)")
    print("   skills:", [(x[1], x[4]) for x in st["מיומנויות"][1:]])
    print("   stations:", r[15:20], "| weak:", r[20], "| params:", r[21])

    # reload: the finished attempt is still there, nothing is sent twice
    page.reload(); page.wait_for_selector("[data-act=resume]"); page.click("[data-act=resume]"); page.wait_for_selector(".final-score")
    page.wait_for_timeout(1500)
    check(len(state()["sheets"]["צעדים"]) == len(rows), "reload does not duplicate step rows")

    # second student, sheet offline for the first half: the queue is kept and sent later
    ctx2 = browser.new_context(viewport={"width": 390, "height": 844}, locale="he-IL", device_scale_factor=2)
    ctx2.route("**/guided/config.js", lambda r: r.fulfill(body=CONFIG, content_type="application/javascript"))
    p2 = ctx2.new_page(); p2.on("pageerror", lambda e: errors.append(str(e)))
    gas("/__up?on=0")
    p2.goto(BASE + "?n=" + urllib.request.quote("יואב כהן")); p2.wait_for_selector("#first")
    check(p2.input_value("#first") == "יואב" and p2.input_value("#last") == "כהן", "?n= fills the name")
    p2.fill("#phone", "+972 54 111 2233"); p2.click("[data-act=start]")
    s2 = steps_of(p2, "יואב כהן")
    for sp in s2[:8]:
        p2.wait_for_selector("#step-current[data-step='%s']" % sp["id"])
        if sp["type"] == "info": p2.click("[data-act=info-ok]"); continue
        if sp["type"] == "sim": p2.click("#sim-play"); p2.wait_for_selector("#step-current.solved", timeout=9000)
        elif sp["type"] == "num": p2.fill("#ans", f"{sp['expected']:.2f}"); p2.click("[data-act=check]")
        else: p2.click(f".opt[data-opt='{sp['correct']}']")
        p2.wait_for_selector("#step-current.solved"); p2.click("[data-act=continue]")
        if sp["id"] == "s1-full": p2.click("[data-act=next-station]")
    p2.wait_for_timeout(600); p2.screenshot(path=str(SHOTS / "mobile_station.png"), full_page=True)
    check(len(state()["sheets"]["הגשות"]) == 2, "sheet offline: nothing arrived yet")
    p2.wait_for_timeout(500)
    gas("/__up?on=1")
    p2.reload(); p2.wait_for_selector("[data-act=resume]")
    p2.wait_for_function("true"); p2.wait_for_timeout(2500)
    st = state()["sheets"]
    check(len(st["הגשות"]) == 3 and st["הגשות"][2][5] == "בתהליך" and st["הגשות"][2][3] == "'0541112233", "after reconnect: second student's row arrived, in progress, +972 phone normalised")
    got2 = [x for x in st["צעדים"][1:] if x[1] == "יואב כהן"]
    check(len(got2) == len([x for x in s2[:8] if x["type"] != "info"]), f"after reconnect: queued steps arrived ({len(got2)})")
    p2.click("[data-act=resume]"); p2.wait_for_selector("#step-current")
    check(p2.get_attribute("#step-current", "data-step") == s2[8]["id"], "resume continues at the next step")
    a, b = steps_of(page, "דנה לוי"), steps_of(p2, "יואב כהן")
    check(any(abs(x["expected"] - y["expected"]) > 1e-6 for x, y in zip(a, b) if x["station"] == "s5" and x["type"] == "num"), "two students get different personal values")
    check(all(x["expected"] == y["expected"] for x, y in zip(a, b) if x["station"] != "s5" and x["type"] == "num"), "the guided stations are identical for everyone")

    # teacher preview: nothing is sent, stations open
    p3 = ctx.new_page(); p3.goto(BASE + "?preview=1&s=4"); p3.wait_for_selector("#step-current")
    check(p3.inner_text(".st-head h2").startswith("בגרות 2016"), "preview opens the requested station")
    p3.click("[data-act=skip]"); p3.wait_for_timeout(300)
    p3.screenshot(path=str(SHOTS / "preview_station4.png"))
    before = len(state()["sheets"]["צעדים"])
    p3.wait_for_timeout(1200)
    check(len(state()["sheets"]["צעדים"]) == before, "preview sends nothing")
    # formula sheet
    page.click("[data-act=formulas]"); page.wait_for_selector(".sheet.open"); page.wait_for_timeout(300); page.screenshot(path=str(SHOTS / "formulas.png"))
    check(not errors, "no console or page errors" + (": " + " | ".join(errors[:5]) if errors else ""))
    browser.close()

print("\n%d failed" % len(fails) if fails else "\nall checks passed")
sys.exit(1 if fails else 0)
