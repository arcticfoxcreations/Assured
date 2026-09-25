# ASSURED — Asset Checklist

Status legend: **REQUIRED** · **OPTIONAL** · **USER-PROVIDED** · **CAN USE ICON LIBRARY**

No emoji is used as a UI icon anywhere in the app. Where an icon is
needed now and no final asset exists yet, ASSURED uses `lucide-react`
(swap-in placeholders — see `src/components/icons` and the app for
usage) so replacing them later is a small, contained change.

| Asset | Status | Where it goes |
|---|---|---|
| ASSURED logo (light + dark) | REQUIRED, USER-PROVIDED | `public/assets/logos/` |
| Favicon / app icon (192, 512, maskable) | REQUIRED, USER-PROVIDED | `public/icons/` |
| Open Graph / share image | OPTIONAL | `public/assets/global/` |
| Mewvi character (idle, listening, thinking) | REQUIRED, USER-PROVIDED | `public/assets/mewvi/` |
| Navigation & general UI icons | CAN USE ICON LIBRARY | `lucide-react` (already wired) |
| Emergency icons (police, fire, ambulance, SOS) | CAN USE ICON LIBRARY, custom OPTIONAL | `public/assets/pages/emergency/` |
| Travel icons (route, check-in, guardian) | CAN USE ICON LIBRARY, custom OPTIONAL | `public/assets/pages/travel/` |
| Cyber safety icons | CAN USE ICON LIBRARY, custom OPTIONAL | `public/assets/pages/cyber/` |
| Women's safety icons | CAN USE ICON LIBRARY, custom OPTIONAL | `public/assets/pages/women/` |
| Child safety icons | CAN USE ICON LIBRARY, custom OPTIONAL | `public/assets/pages/children/` |
| Guardian icons | CAN USE ICON LIBRARY, custom OPTIONAL | `public/assets/pages/community/` |
| Map markers (user, destination, police, hospital, fire, community report) | REQUIRED, USER-PROVIDED or icon library | `public/assets/maps/` |
| Illustrations (homepage, empty states) | OPTIONAL | `public/assets/illustrations/` |

Every folder listed above already exists in the repo (with a `.gitkeep`
placeholder) so you can drop real files in without restructuring
anything.
