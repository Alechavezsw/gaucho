"""Synthetic images. A future WebRTC gateway implements the camera adapter."""
from datetime import datetime, timezone


def render_scene(camera_id: str) -> str:
    offset = int(camera_id) * 35
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#546f77"/><stop offset="1" stop-color="#bbc0a7"/></linearGradient>
    <pattern id="soil" width="63" height="47" patternUnits="userSpaceOnUse"><circle cx="12" cy="24" r="2" fill="#736349"/><path d="M33 10l6-2 3 4-5 1" fill="#c7b38b"/></pattern></defs>
    <rect width="960" height="540" fill="url(#sky)"/>
    <path d="M0 265L100 190 220 255 360 160 540 263 730 195 960 280V540H0" fill="#59584b"/>
    <path d="M0 330Q200 260 400 330T960 310V540H0" fill="#9c8963"/>
    <path d="M0 330Q200 260 400 330T960 310V540H0" fill="url(#soil)"/>
    <path d="M390 540L470 320H495L620 540" fill="#bdab84"/>
    <path d="M450 540L480 325M560 540L491 325" stroke="#a99770" stroke-width="9"/>
    <g stroke="#484e3a" stroke-width="3"><path d="M0 370L960 315M0 380L960 325"/><path d="M60 352v55m140-61v48m140-55v41m300-67v36m170-47v36"/></g>
    <g fill="#383d31" transform="translate({offset},0)"><ellipse cx="270" cy="365" rx="40" ry="20"/>
    <circle cx="311" cy="354" r="13"/><path d="M243 374v35h8v-35m34 0v35h8v-35"/>
    <ellipse cx="700" cy="343" rx="28" ry="14"/><circle cx="726" cy="336" r="9"/>
    <path d="M682 350v23h5v-23m22 0v23h5v-23"/></g>
    <g fill="#6f714c"><path d="M100 440l15-35 20 35m680 45l20-50 20 50m-90-70l10-25 15 25"/></g>
    <text x="25" y="510" fill="white" font-family="monospace" font-size="13">ESCENA SINTÉTICA / CAM {camera_id} / {datetime.now(timezone.utc).isoformat()}</text></svg>'''
