# EcoDash — African Digital Logistics & Infrastructure Simulator

## Project Description

EcoDash is an interactive 2D simulation built with **HTML5 Canvas, CSS3, and vanilla JavaScript (ES6+)** that
models the real-world challenges of last-mile delivery logistics in rural and underserved African communities.

The player drives a **solar-powered electric delivery truck**, navigating rural roads to deliver essential
supplies  medical kits, educational materials, emergency aid, and food to a rotating set of delivery
depots (a rural clinic, a village school, a flood relief camp, and more). Along the way the player must:

- Manage a limited **Solar Reserve (battery)** that drains while driving and recharges only at green
  **Solar Microgrid Zones**.
- React to unpredictable **weather** (rain reduces visibility; crosswinds push the vehicle off course).
- Cope with **load-shedding**, which periodically disables charging stations, just as it does for real
  infrastructure in South Africa.
- Avoid physical obstacles representative of rural infrastructure challenges: potholes, wildlife crossings,
  fallen trees, flooded river crossings, and construction zones.

The simulation is not a traditional arcade game — it is designed to demonstrate, through interactive
gameplay, how sustainable technology (solar power, electric vehicles) and careful resource planning can help
overcome authentic African logistics challenges.

## Features

| Requirement | Implementation |
|---|---|
| Trigonometric movement | `Math.sin()`/`Math.cos()` convert the truck's steering angle into lateral velocity |
| Battery / energy system | Solar Reserve drains with speed and weather, recharges only in Microgrid Zones |
| Object-oriented design | `Truck`, `Obstacle`, `SolarStation`, `Depot`, and `DustParticle` classes |
| Collision detection | AABB (rectangle) and circular-distance checks against the truck's bounding box |
| Environmental effects | Rain (visibility), wind (lateral drift), load-shedding (disables stations) |
| Delivery missions | Rotating depot targets with mission labels and scoring |
| Score system & persistence | Distance, mission score, and efficiency bonus saved to `localStorage`, top-5 high scores per difficulty |
| Screens | Start (with difficulty select), Pause, Game Over — restart without a page refresh |
| Responsive design | Canvas resizes to the viewport using `devicePixelRatio`-aware scaling |
| Difficulty levels | Easy / Hard / Ultimate, each adjusting spawn rate, battery drain, obstacle damage, wind, and rain frequency |
| Original feature | `DustParticle` trail system spawned behind the truck while moving |

## Project Folder Structure

```
EcoDash-African-Logistics/
├── index.html          # Page structure, links style.css and script.js
├── style.css            # All styling: layout, HUD, screens, responsive rules
├── script.js             # Game logic: classes, physics, collisions, game loop
├── README.md            # This file
├── docs/
│   ├── african-problem-report.md   # Task 1.2 — problem context & math model
│   ├── wireframe.png (or .pdf)     # Task 1.3 — wireframe sketch
│   └── ai-reflection-log.md         # Task 1.3 — AI usage reflection
└── assets/               # (optional) any additional images/icons used
```

## Installation / Setup Instructions

No build tools, package managers, or external game engines are required — this is a pure
HTML/CSS/JavaScript project.

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/EcoDash-African-Logistics.git
   cd EcoDash-African-Logistics
   ```
2. Open `index.html` directly in a modern browser (Chrome, Firefox, or Edge), **or** serve it locally to
   avoid any browser file-access restrictions:
   ```bash
   # Python 3
   python3 -m http.server 8000
   # then visit http://localhost:8000 in your browser
   ```
3. Alternatively, enable **GitHub Pages** on this repository (Settings → Pages → deploy from `main` branch)
   to play it directly from a public URL.

### Controls
| Key | Action |
|---|---|
| ↑ / W | Accelerate |
| ↓ / S | Brake / reverse |
| ← / A | Steer left |
| → / D | Steer right |
| P | Pause / resume |
| M | Mute / unmute audio |

## Original Feature (Task 2.3 — built without Generative AI)

The **dust-particle trail system** (`DustParticle` class in `script.js`) was written and tuned independently
to represent the truck kicking up dust from unpaved rural roads. Each particle is spawned with a small random
horizontal and downward velocity and a limited lifespan, fading out (`globalAlpha`) as it ages. This adds
visual feedback tied directly to the truck's speed without needing any external sprite sheets or libraries.

