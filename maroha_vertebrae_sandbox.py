import marimo

__generated_with = "0.9.14"
app = marimo.App(width="full")


@app.cell
def _(mo):
    mo.md("# AROHA 33-Vertebrae Sandbox (Port 8085)")
    return

# --- AROHA Live SSE Telemetry & UBO/Unlock Controls ---
@app.cell
def _():
    import json as _sse_json
    import time as _sse_time
    from datetime import datetime as _sse_dt, timezone as _sse_tz
    from urllib import request as _sse_request
    import marimo as mo
    return _sse_dt, _sse_json, _sse_request, _sse_time, _sse_tz, mo


@app.cell
def _(mo):
    sse_base_url = mo.ui.text(
        value="http://127.0.0.1:8000",
        label="FastAPI Base URL",
        full_width=True,
    )
    sse_stream_path = mo.ui.text(
        value="/api/v1/portal/telemetry/stream",
        label="SSE Stream Route",
        full_width=True,
    )
    sse_live_switch = mo.ui.switch(
        value=True,
        label="Live SSE Stream",
    )
    sse_clear_btn = mo.ui.button(
        label="Clear Log",
        kind="danger",
    )
    mo.hstack(
        [sse_base_url, sse_stream_path, sse_live_switch, sse_clear_btn],
        widths=[2, 2, 1, 1],
        gap=1,
    )
    return sse_base_url, sse_clear_btn, sse_live_switch, sse_stream_path


@app.cell
def _(mo):
    ubo_vertebrae = mo.ui.number(
        value=33,
        start=1,
        stop=64,
        step=1,
        label="Vertebrae Count",
    )
    ubo_chladni = mo.ui.text(
        value="5,7",
        label="Chladni Mode (m,n)",
    )
    ubo_harmonic_lock = mo.ui.switch(
        value=True,
        label="Harmonic Lock",
    )
    ubo_focus_state = mo.ui.number(
        value=12,
        start=0,
        stop=999,
        step=1,
        label="Focus State",
    )
    ubo_push_btn = mo.ui.button(
        label="Push UBO State & Unlock Check",
        kind="success",
    )
    mo.vstack(
        [
            mo.md("### UBO & Portal Unlock Controls"),
            mo.hstack(
                [ubo_vertebrae, ubo_chladni, ubo_harmonic_lock, ubo_focus_state],
                gap=1,
            ),
            ubo_push_btn,
        ]
    )
    return (
        ubo_chladni,
        ubo_focus_state,
        ubo_harmonic_lock,
        ubo_push_btn,
        ubo_vertebrae,
    )


@app.cell
def _(mo):
    get_sse_rows, set_sse_rows = mo.state([])
    return get_sse_rows, set_sse_rows


@app.cell
def _(
    _sse_json,
    _sse_request,
    sse_base_url,
    ubo_chladni,
    ubo_focus_state,
    ubo_harmonic_lock,
    ubo_push_btn,
    ubo_vertebrae,
):
    last_push_payload = None
    if ubo_push_btn.value:
        modes = [
            int(part.strip())
            for part in ubo_chladni.value.split(",")
            if part.strip().isdigit()
        ]
        if len(modes) < 2:
            modes = [5, 7]
        state_endpoint = f"{sse_base_url.value.rstrip('/')}/api/v1/portal/telemetry/state"
        req_body = _sse_json.dumps(
            {
                "vertebrae_count": int(ubo_vertebrae.value),
                "chladni_mode": modes[:2],
                "harmonic_lock": bool(ubo_harmonic_lock.value),
                "focus_state": int(ubo_focus_state.value),
                "trigger_unlock": True,
            }
        ).encode("utf-8")
        try:
            req = _sse_request.Request(
                state_endpoint,
                data=req_body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with _sse_request.urlopen(req, timeout=2.0) as resp:
                last_push_payload = _sse_json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            last_push_payload = {"error": f"{type(exc).__name__}: {exc}"}
    return (last_push_payload,)


@app.cell
def _(
    _sse_dt,
    _sse_json,
    _sse_request,
    _sse_time,
    _sse_tz,
    get_sse_rows,
    mo,
    set_sse_rows,
    sse_base_url,
    sse_clear_btn,
    sse_live_switch,
    sse_stream_path,
):
    if sse_live_switch.value:
        mo.timer("1s")

    if sse_clear_btn.value:
        set_sse_rows([])

    stream_url = f"{sse_base_url.value.rstrip('/')}/{sse_stream_path.value.lstrip('/')}"
    t_start = _sse_time.perf_counter()
    sse_frame = None
    sse_event_id = None
    sse_err = None

    try:
        req = _sse_request.Request(
            stream_url,
            headers={"Accept": "text/event-stream", "Cache-Control": "no-cache"},
            method="GET",
        )
        with _sse_request.urlopen(req, timeout=2.5) as resp:
            while True:
                raw_line = resp.readline()
                if not raw_line:
                    break
                line = raw_line.decode("utf-8", errors="replace").strip()
                if line.startswith("id:"):
                    sse_event_id = line[3:].strip()
                elif line.startswith("data:"):
                    sse_frame = _sse_json.loads(line[5:].strip())
                    break
    except Exception as exc:
        sse_err = f"{type(exc).__name__}: {exc}"

    sse_latency_ms = round((_sse_time.perf_counter() - t_start) * 1000.0, 2)
    fallback_ts = _sse_dt.now(_sse_tz.utc).strftime("%H:%M:%S.%f")[:-3] + "Z"

    sse_row = {
        "ts": sse_frame.get("ts", fallback_ts) if isinstance(sse_frame, dict) else fallback_ts,
        "id": sse_event_id,
        "latency_ms": sse_latency_ms,
        "unlocked": sse_frame.get("unlocked") if isinstance(sse_frame, dict) else None,
        "resonance": sse_frame.get("resonance") if isinstance(sse_frame, dict) else None,
        "ubo_harmonic": sse_frame.get("ubo_harmonic") if isinstance(sse_frame, dict) else None,
        "vertebrae": sse_frame.get("vertebrae_count") if isinstance(sse_frame, dict) else None,
        "chladni": str(sse_frame.get("chladni_mode")) if isinstance(sse_frame, dict) else None,
        "error": sse_err,
    }

    sse_history = ([sse_row] + list(get_sse_rows()))[:120]
    set_sse_rows(sse_history)
    return sse_err, sse_frame, sse_history, sse_row


@app.cell
def _(last_push_payload, mo, sse_err, sse_history, sse_row):
    status_callout = mo.callout(
        mo.md(
            f"""
            **SSE Frame `#{sse_row["id"]}` @ `{sse_row["ts"]}` (`{sse_row["latency_ms"]} ms`):**  
            **Unlocked:** `{sse_row["unlocked"]}` | **Resonance:** `{sse_row["resonance"]}` | **UBO Harmonic:** `{sse_row["ubo_harmonic"]}`  
            **Error:** `{sse_err or "None"}`
            """
        ),
        kind="success" if sse_err is None else "warn",
    )
    blocks = [mo.md("### Live SSE Resonance & UBO Stream"), status_callout]
    if last_push_payload is not None:
        blocks.append(mo.md(f"**Last UBO/Unlock Push:** `{last_push_payload}`"))
    blocks.append(mo.ui.table(sse_history, selection=None))
    mo.vstack(blocks)
    return


@app.cell
def _(mo, sse_err, sse_frame):
    mo.md("### Latest SSE Telemetry Payload")
    mo.json(sse_frame if sse_frame is not None else {"error": sse_err})
    return


if __name__ == "__main__":
    app.run()

