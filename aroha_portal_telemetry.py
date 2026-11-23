import marimo

__generated_with = "0.9.14"
app = marimo.App(width="full")


@app.cell
def _():
    import json
    import time
    from datetime import datetime, timezone
    from urllib import error, request
    import marimo as mo
    return datetime, error, json, mo, request, time, timezone


@app.cell
def _(mo):
    base_url_input = mo.ui.text(
        value="http://127.0.0.1:8000",
        label="FastAPI Base URL",
        full_width=True,
    )
    sse_route_input = mo.ui.text(
        value="/api/v1/portal/telemetry/stream",
        label="SSE Stream Route",
        full_width=True,
    )
    stream_toggle = mo.ui.switch(
        value=True,
        label="Live SSE Stream",
    )
    clear_btn = mo.ui.button(
        label="Clear Log",
        kind="danger",
    )
    mo.hstack([base_url_input, sse_route_input, stream_toggle, clear_btn], widths=[2, 2, 1, 1], gap=1)
    return base_url_input, clear_btn, sse_route_input, stream_toggle


@app.cell
def _(mo):
    vertebrae_num = mo.ui.number(value=33, start=1, stop=64, step=1, label="Vertebrae Count")
    chladni_text = mo.ui.text(value="5,7", label="Chladni Mode (m,n)")
    harmonic_lock_sw = mo.ui.switch(value=True, label="Harmonic Lock")
    focus_num = mo.ui.number(value=12, start=0, stop=999, step=1, label="Focus State")
    push_state_btn = mo.ui.button(label="Push State / Trigger Unlock", kind="success")

    mo.vstack(
        [
            mo.md("### SSE UBO & Portal Unlock Control"),
            mo.hstack([vertebrae_num, chladni_text, harmonic_lock_sw, focus_num], gap=1),
            push_state_btn,
        ]
    )
    return (
        chladni_text,
        focus_num,
        harmonic_lock_sw,
        push_state_btn,
        vertebrae_num,
    )


@app.cell
def _(mo):
    get_log, set_log = mo.state([])
    return get_log, set_log


@app.cell
def _(
    base_url_input,
    chladni_text,
    focus_num,
    harmonic_lock_sw,
    json,
    push_state_btn,
    request,
    vertebrae_num,
):
    push_result = None
    if push_state_btn.value:
        modes = [int(p.strip()) for p in chladni_text.value.split(",") if p.strip().isdigit()]
        if len(modes) < 2:
            modes = [5, 7]
        state_url = f"{base_url_input.value.rstrip('/')}/api/v1/portal/telemetry/state"
        body = json.dumps(
            {
                "vertebrae_count": int(vertebrae_num.value),
                "chladni_mode": modes[:2],
                "harmonic_lock": bool(harmonic_lock_sw.value),
                "focus_state": int(focus_num.value),
                "trigger_unlock": True,
            }
        ).encode("utf-8")
        try:
            req = request.Request(
                state_url,
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with request.urlopen(req, timeout=2.0) as resp:
                push_result = json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            push_result = {"error": f"{type(exc).__name__}: {exc}"}
    return (push_result,)


@app.cell
def _(
    base_url_input,
    clear_btn,
    datetime,
    get_log,
    json,
    mo,
    request,
    set_log,
    sse_route_input,
    stream_toggle,
    time,
    timezone,
):
    if stream_toggle.value:
        mo.timer(0.5)

    if clear_btn.value:
        set_log([])

    sse_url = f"{base_url_input.value.rstrip('/')}/{sse_route_input.value.lstrip('/')}"
    t0 = time.perf_counter()
    frame = None
    event_id = None
    err = None

    try:
        req = request.Request(
            sse_url,
            headers={"Accept": "text/event-stream", "Cache-Control": "no-cache"},
            method="GET",
        )
        with request.urlopen(req, timeout=2.5) as resp:
            while True:
                raw_line = resp.readline()
                if not raw_line:
                    break
                line = raw_line.decode("utf-8", errors="replace").strip()
                if line.startswith("id:"):
                    event_id = line[3:].strip()
                elif line.startswith("data:"):
                    frame = json.loads(line[5:].strip())
                    break
    except Exception as exc:
        err = f"{type(exc).__name__}: {exc}"

    latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    now_ts = datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3] + "Z"

    row = {
        "ts": frame.get("ts", now_ts) if isinstance(frame, dict) else now_ts,
        "sse_id": event_id,
        "latency_ms": latency_ms,
        "unlocked": frame.get("unlocked") if isinstance(frame, dict) else None,
        "resonance": frame.get("resonance") if isinstance(frame, dict) else None,
        "ubo_harmonic": frame.get("ubo_harmonic") if isinstance(frame, dict) else None,
        "vertebrae": frame.get("vertebrae_count") if isinstance(frame, dict) else None,
        "chladni": str(frame.get("chladni_mode")) if isinstance(frame, dict) else None,
        "error": err,
    }

    history = ([row] + list(get_log()))[:120]
    set_log(history)
    return err, frame, history, row


@app.cell
def _(err, history, mo, push_result, row):
    banner = mo.callout(
        mo.md(
            f"""
            **SSE Event (`#{row["sse_id"]}` @ `{row["ts"]}` | `{row["latency_ms"]} ms`):**  
            **Unlocked:** `{row["unlocked"]}` | **Resonance:** `{row["resonance"]}` | **UBO Harmonic:** `{row["ubo_harmonic"]}`  
            **Error:** `{err or "None"}`
            """
        ),
        kind="success" if err is None else "warn",
    )
    items = [mo.md("### Live SSE Resonance & UBO Telemetry"), banner]
    if push_result is not None:
        items.append(mo.md(f"**Last State Push Response:** `{push_result}`"))
    items.append(mo.ui.table(history, selection=None))
    mo.vstack(items)
    return


@app.cell
def _(err, frame, mo):
    mo.md("### Latest SSE JSON Frame")
    mo.json(frame if frame is not None else {"error": err})
    return


if __name__ == "__main__":
    app.run()
