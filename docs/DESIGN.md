# Factorio Router — visual design system

The UI is styled to read as a Factorio in-game panel. This document records
what makes that style recognisable, and the rules the stylesheet follows so
new components stay consistent.

Reference studied: [factorioblueprints.tech](https://factorioblueprints.tech/),
alongside Factorio's own GUI.

---

## 1. What actually makes it look like Factorio

Five things do nearly all the work. They matter roughly in this order:

**1. The palette is warm.** Factorio's GUI is brown-grey — dirt, rust and
oiled steel. Most dark web UIs (including this app's previous look) are
blue-grey. Shifting the hue from cyan-blue to warm neutral is the single
highest-impact change; nothing else reads as Factorio without it.

**2. Nothing is flat.** There are no `1px` borders and no flat cards. Every
surface is a stamped metal plate that is either **raised** (lit along the top
edge, black beneath) or **sunken** (shadowed from the top lip, lit along the
bottom). Depth is the whole visual language: raised = a thing, sunken = a
place a thing goes.

**3. Titillium Web.** Factorio's actual UI typeface. A humanist sans with
squared terminals and slightly condensed caps. It is on Google Fonts under the
OFL, so it can be used directly.

**4. Grey goes orange.** Factorio's standard button is grey and turns a warm
orange (`#e39827`) with a glow on hover. This one interaction is the most
distinctive tell in the entire game UI. Green means confirm.

**5. Ground texture.** Panels float over a mottled industrial surface, not a
flat fill. Ours is generated in CSS (SVG `feTurbulence` grain + warm radial
lighting + a faint 64px tile grid) rather than shipping an image.

Two supporting cues: **amber label text** (`#ffe6c0`) for headings and values,
and **hazard-concrete stripes** as a rule under the header and footer.

---

## 2. Tokens

All defined on `:root` in `frontend/src/App.css`.

### Surfaces — warm neutral, never blue

| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `#201810` | the page itself, under the texture |
| `--panel` | `#313031` | raised plate — every `.panel` |
| `--panel-lit` | `#3d3c3c` | raised plate, hovered or selected |
| `--well` | `#383737` | shallow recess |
| `--well-deep` | `#262525` | control interiors: inputs, slots |
| `--well-black` | `#1c1918` | deepest recess: readouts, lists |

### Bevel edges

| Token | Value | Use |
| --- | --- | --- |
| `--edge-hi` | `#8f8c8b` | the edge struck by the light |
| `--edge-hi-2` | `#6f6b69` | secondary highlight |
| `--edge-lo` | `#201815` | the edge in shade |
| `--edge-lo-2` | `#14100e` | deepest shade |

### Ink

| Token | Value | Contrast on `--panel` |
| --- | --- | --- |
| `--text` | `#ece9e5` | 11.9:1 |
| `--amber` | `#ffe6c0` | 10.9:1 — headings, labels, values |
| `--muted` | `#bdb5ab` | 6.5:1 — secondary text |
| `--dim` | `#a49d94` | 4.9:1 — tertiary; **the floor for body text** |

### Accents

| Token | Value | Meaning |
| --- | --- | --- |
| `--orange` / `--orange-lit` | `#e39827` / `#f9b44b` | hover, selection, emphasis |
| `--green` / `--green-hi` | `#5eb663` / `#95df99` | confirm, valid, ready |
| `--red` | `#b8453a` | warning, destructive |
| `--steel` / `--steel-hi` | `#8e8e8e` / `#e3e3e3` | the standard button face |

---

## 3. The two primitives

Everything is built from these. Prefer them over inventing new shadows.

```css
box-shadow: var(--raised);   /* a plate sitting on the surface */
box-shadow: var(--sunken);   /* a recess cut into the plate   */
```

They are exact inverses. `--raised` lights the top edge and blacks the bottom;
`--sunken` casts a shadow from the top lip and lights the bottom. Each is
built from three stacked shadows per edge (3px/2px/1px) so the bevel stays
crisp instead of blurring into a gradient.

**Which to use:** a control the user acts *on* is raised (buttons, chips,
tabs). A place data *sits in* is sunken (inputs, the blueprint canvas, the
metrics readout, build-list slots, table wells).

### Buttons

Buttons use a third recipe, `--face`, which is declared **on the element**
rather than on `:root`:

```css
button, .brand-mark, .status-chip {
  --lip: var(--steel-hi);
  --face: inset 0 10px 2px -8px var(--lip), /* … */;
  box-shadow: var(--face);
}
.primary { --lip: var(--green-hi); }
```

This placement is deliberate and load-bearing. A `var()` nested inside a
custom property is substituted where that property is *declared*, so a
`--lip` defined on `:root` would bake in one colour and every variant would
inherit the same highlight. Declaring `--face` on the elements lets each
variant's `--lip` resolve against itself.

To add a button variant, set `--lip` and a background — never hand-roll the
shadow stack.

---

## 4. Component rules

- **Radius** is 3–6px. Panels 6px, controls and buttons 3px. Nothing is pill-shaped except by accident of height.
- **Headings** are `--amber` with a hard dark `text-shadow` — game UI text is always shadowed for legibility over texture.
- **Numbers** are amber, bold, `font-variant-numeric: tabular-nums`, in a sunken readout.
- **Focus** is a 2px `--orange-lit` outline plus a warm glow. Never remove it.
- **Disabled** is `opacity: .4` plus `saturate(.4)` so green and orange stop shouting.
- **Pressing** a button swaps `--face` for `--btn-press` (the inverted bevel) and nudges it 1px down. It should feel like it physically moves.
- **Lists of countable things** (the build list) are inventory slot grids: sunken cells, name left, amber count right.

---

## 5. Accessibility floor

The style is dark and low-contrast by nature, so these are non-negotiable:

- Body text meets **WCAG AA (4.5:1)** against the surface behind it. `--dim` is the darkest permitted ink on `--panel`; anything dimmer needs a darker well behind it.
- Button labels are dark ink on light faces, which clears AA on steel, orange and green. Red could not — so the invalid status chip uses **light ink on a darker red** (`#a33328`/`#ffe6e0`, 5.6:1) instead.
- State is never colour alone: the status chip changes its text, and constraint failures also render a written alert.
- Transitions are dropped under `prefers-reduced-motion`.

---

## 6. Things deliberately not done

- **No copied assets.** The reference site's background is a hosted JPEG; ours is generated in CSS. No Factorio game art is redistributed.
- **No rivets or ornament** on panels. Factorio's own GUI is restrained; ornament reads as pastiche.
- **No light theme.** The style only makes sense dark; `color-scheme` is pinned to `dark`.
