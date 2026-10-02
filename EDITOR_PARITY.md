# Editor parity with the Webflow Designer

Checked against the running editor (screenshots) and the code. "Yes" means it exists and was seen working.

| Webflow Designer area                                                                                                                         | BD Flow editor                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Left rail: Add elements, Pages, Navigator, Assets, CMS                                                                                        | Yes. Add, Pages, Navigator, Assets, CMS, Marketplace                                                                 |
| Top bar: breakpoints, preview, share, publish                                                                                                 | Yes. Breakpoints, preview, share, publish                                                                            |
| Right panel tabs: Style, Settings, Interactions                                                                                               | Yes. Style, Settings, Interactions (new)                                                                             |
| Style panel: layout, flex/grid, spacing, size, position, typography, backgrounds, borders, shadows, filters, transforms, transitions, outline | Yes, all present                                                                                                     |
| Classes (shared styles), pseudo-states (hover, focus, pressed)                                                                                | Yes (style sources, states)                                                                                          |
| Responsive breakpoints, custom breakpoints                                                                                                    | Yes                                                                                                                  |
| Variables / dynamic content bindings                                                                                                          | Yes, plus CMS bindings                                                                                               |
| Components (reusable, with properties), slots                                                                                                 | Yes (instances, slots)                                                                                               |
| Interactions: scroll into view, scroll position                                                                                               | Yes (Animation Group)                                                                                                |
| Interactions: text reveal, stagger, video scroll                                                                                              | Yes (Text, Stagger, Video animation)                                                                                 |
| Interactions: hover and click triggers                                                                                                        | Partly. Hover and pressed look changes work through states plus transitions. Click-triggered timelines are not built |
| Interactions: page load trigger                                                                                                               | Not built                                                                                                            |
| Dark interface                                                                                                                                | Yes, now the default                                                                                                 |
| Custom code, embeds                                                                                                                           | Yes                                                                                                                  |
| Navigator drag and drop, copy and paste between sites                                                                                         | Yes                                                                                                                  |
| Ecommerce and Memberships elements                                                                                                            | No                                                                                                                   |
| Lottie animations                                                                                                                             | No                                                                                                                   |

## What changed in this pass

- New **Interactions** tab. For a selected element it offers four interaction types; choosing one
  wraps the element in the matching animation component and opens its controls. For an element
  that is already inside one, it jumps to the wrapper.
- The editor opens dark by default (still switchable from the menu).

## Added since

- Interactions: page load, click (with toggle), hover and mouse move triggers; a working engine for
  scroll into view and while scrolling; split text and stagger. Upstream shipped the animation
  components as empty placeholders; BD Flow has its own runtime.
- Left rail: Components (reusable pieces with copies), Variables, Style selectors, Audit, CMS.
  The element library is now "Add elements".
- Google Fonts: 55 families in the font picker, loaded on the canvas and on published pages.
  Checked in the editor (stylesheet present, font loaded) and in a static build.
- Site settings: SEO (site address, language, hide from search engines, robots.txt, home screen
  icon), code before the closing body tag, Integrations, Forms.
