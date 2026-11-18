import marimo

__generated_with = "0.10.0"
app = marimo.App(width="medium", app_title="AROHA 33-Vertebrae Live Sync Portal")


@app.cell
def _():
    import json
    import math
    import urllib.error
    import urllib.request
    import marimo as mo

    PORTAL_API_BASE = "http://127.0.0.1:3013/api/v1/portal"
    return PORTAL_API_BASE, json, math, mo, urllib


@app.cell
def _(mo):
    get_last_submit_id, set_last_submit_id = mo.state(0)

    refresh = mo.ui.refresh(
        options=["1s", "2s", "5s", "Off"],
        default_interval="2s",
        label="Live Telemetry Poll (:3013/api/v1/portal/state)",
    )

    controls = mo.ui.dictionary(
        {
            "vertebrae_count": mo.ui.slider(
                1, 33, value=33, label="Spinal Vertebrae Index (1-33)"
            ),
            "m_mode": mo.ui.slider(1, 9, value=5, label="Chladni Nodal Mode m"),
            "n_mode": mo.ui.slider(1, 9, value=7, label="Chladni Nodal Mode n"),
            "focus_state": mo.ui.dropdown(
                options={
                    "Focus 10 - Mind Awake / Body Asleep (7.5 Hz Theta)": 10,
                    "Focus 12 - Expanded Awareness (4.0 Hz Theta-Delta)": 12,
                    "Focus 15 - No-Time State (2.5 Hz Delta)": 15,
                    "Focus 21 - Edge of Time-Space (1.5 Hz Epsilon)": 21,
                },
                value="Focus 12 - Expanded Awareness (4.0 Hz Theta-Delta)",
                label="Gateway Consciousness Focus State",
            ),
            "harmonic_lock": mo.ui.switch(value=True, label="Harmonic Phase Lock"),
        }
    ).form(submit_button_label="Transmit Manual Override to :3013")

    mo.vstack(
        [
            mo.md("## AROHA 33-Vertebrae Tri-Screen Synchronized Telemetry"),
            mo.hstack([refresh], justify="start"),
            controls,
        ]
    )
    return controls, get_last_submit_id, refresh, set_last_submit_id


@app.cell
def _(PORTAL_API_BASE, controls, get_last_submit_id, json, mo, set_last_submit_id, urllib):
    # Only fire POST when the user explicitly clicks the form submit button
    post_status = None
    if controls.value is not None:
        submit_token = id(controls.value)
        if submit_token != get_last_submit_id():
            set_last_submit_id(submit_token)
            body = {
                "vertebrae_count": int(controls.value["vertebrae_count"]),
                "chladni_mode": [
                    int(controls.value["m_mode"]),
                    int(controls.value["n_mode"]),
                ],
                "harmonic_lock": bool(controls.value["harmonic_lock"]),
                "focus_state": int(controls.value["focus_state"]),
            }
            req = urllib.request.Request(
                f"{PORTAL_API_BASE}/unlock",
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=3) as resp:
                    post_status = json.loads(resp.read().decode("utf-8"))
            except Exception as exc:
                post_status = {"status": "error", "detail": str(exc)}

    mo.stop(post_status is None)
    mo.callout(
        mo.md(
            f"**Manual Override Sent (`POST /api/v1/portal/unlock`):**\n```json\n{json.dumps(post_status, indent=2)}\n```"
        ),
        kind="success" if post_status.get("status") == "unlocked" else "warn",
    )
    return (post_status,)


@app.cell
def _(PORTAL_API_BASE, json, post_status, refresh, urllib):
    # Re-runs automatically on every mo.ui.refresh tick or immediately after a manual POST
    _ = (refresh.value, post_status)

    try:
        req = urllib.request.Request(
            f"{PORTAL_API_BASE}/state",
            headers={"Accept": "application/json", "Cache-Control": "no-cache"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            live_state = json.loads(resp.read().decode("utf-8"))
            fetch_error = None
    except Exception as exc:
        live_state = {
            "status": "offline",
            "gateway": "zenith_26",
            "token": None,
            "resonance": {
                "vertebrae_count": 33,
                "chladni_mode": [5, 7],
                "harmonic_lock": False,
                "focus_state": 12,
                "carrier_hz": 136.1,
                "binaural_offset_hz": 4.0,
            },
            "solvers": [],
        }
        fetch_error = str(exc)

    return fetch_error, live_state


@app.cell
def _(fetch_error, live_state, math, mo):
    res = live_state.get("resonance") or {}
    mode = res.get("chladni_mode") or [5, 7]
    m = int(mode[0]) if len(mode) > 0 else 5
    n = int(mode[1]) if len(mode) > 1 else 7
    v_idx = int(res.get("vertebrae_count", 33))
    focus = int(res.get("focus_state", 12))
    locked_ok = bool(res.get("harmonic_lock", False)) and live_state.get("status") == "unlocked"
    carrier_hz = float(res.get("carrier_hz", round(136.1 * (v_idx / 33.0), 2)))
    beat_hz = float(res.get("binaural_offset_hz", 4.0))

    left_hz = round(carrier_hz - beat_hz / 2.0, 3)
    right_hz = round(carrier_hz + beat_hz / 2.0, 3)

    focus_meta = {
        10: ("Theta boundary — somatic relaxation / mind alert", "#38bdf8"),
        12: ("Theta-Delta bridge — expanded spatial perception", "#5eead4"),
        15: ("Deep Delta — linear time decoupling", "#a78bfa"),
        21: ("Epsilon-Delta — non-local gateway threshold", "#fbbf24"),
    }
    focus_desc, accent = focus_meta.get(focus, ("Custom Gateway state", "#5eead4"))
    if not locked_ok:
        accent = "#f87171"

    # Render Chladni nodal plate SVG synchronized to live_state
    grid = 48
    cell_px = 7
    size_px = grid * cell_px
    rects = []
    for iy in range(grid):
        y = (iy + 0.5) / grid
        for ix in range(grid):
            x = (ix + 0.5) / grid
            z = math.cos(m * math.pi * x) * math.cos(n * math.pi * y) - math.cos(
                n * math.pi * x
            ) * math.cos(m * math.pi * y)
            nodal_proximity = max(0.0, 1.0 - min(abs(z) * 2.4, 1.0))
            if nodal_proximity > 0.15:
                alpha = round(nodal_proximity, 2)
                rects.append(
                    f'<rect x="{ix * cell_px}" y="{iy * cell_px}" '
                    f'width="{cell_px}" height="{cell_px}" fill="{accent}" fill-opacity="{alpha}" />'
                )

    svg = (
        f'<svg width="{size_px}" height="{size_px}" viewBox="0 0 {size_px} {size_px}" '
        f'style="background:#090d16;border:1px solid #1e293b;border-radius:8px;">'
        f'{"".join(rects)}</svg>'
    )

    solvers = live_state.get("solvers") or []
    latest_source = solvers[-1].get("source", "initial") if solvers else "none"
    recent_rows = "\n".join(
        f"| `{s.get('unlocked_at_utc', '-')}` | `{s.get('source', '-')}` | `Focus {s.get('focus_state', '-')}` | `{s.get('chladni_mode', '-')}` | `{s.get('binaural_offset_hz', '-')} Hz` |"
        for s in reversed(solvers[-5:])
    )
    if not recent_rows:
        recent_rows = "| `-` | `-` | `-` | `-` | `-` |"

    banner = (
        mo.callout(mo.md(f"**Poll warning:** `{fetch_error}`"), kind="danger")
        if fetch_error
        else mo.callout(
            mo.md(
                f"**Gateway `{live_state.get('gateway')}` (`{live_state.get('status')}`)** — "
                f"Last update: `{live_state.get('last_unlocked_utc', 'n/a')}` via `{latest_source}`"
            ),
            kind="success" if locked_ok else "warn",
        )
    )

    mo.vstack(
        [
            banner,
            mo.hstack(
                [
                    mo.Html(svg),
                    mo.md(
                        f"""
### Live Synchronized Resonance
* **Gateway Focus:** `Focus {focus}` ({focus_desc})
* **Chladni Eigenmode:** `({m}, {n})` | **Vertebrae:** `{v_idx}/33`
* **Dichotic Channels:** Left `{left_hz} Hz` / Right `{right_hz} Hz`
* **Carrier / Binaural Beat:** `{carrier_hz} Hz` / `{beat_hz} Hz`
* **Total Ledger Entries:** `{len(solvers)}`

| UTC Timestamp | Source | Focus | Mode | Beat |
| :--- | :--- | :--- | :--- | :--- |
{recent_rows}
"""
                    ),
                ],
                align="center",
                gap=2,
            ),
        ]
    )
    return


if __name__ == "__main__":
    app.run()