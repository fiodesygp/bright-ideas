# Facilitator checklist: verify against your real kit

The app makes specific claims about the miniAgriPV kit. Before students use it, check each item below against the parts in your kit. If something is wrong, edit the file and key shown. Text changes need no code. Items marked **(code)** live in a drawing and need a small code edit.

Paths are written as `file → JSON path`. All content files are in `src/content/`.

## Uploads to the project team

The app saves each student's name (first name or nickname), plant, log entries, photos and simulation runs on the device, and uploads them to the project team's database when the device is online.

- [ ] **Consent is in place** for every student who will use the app, and they know their log and photos are shared with the project team. The app says so under the name and photo fields and in Settings → "Where your log goes".
- [ ] **Uploads arrive.** On one class device, add a test entry with a photo. The Planting Log should soon say "All entries uploaded". Ask the team to confirm it shows up, then delete the test entry.
- [ ] **Simulation runs arrive too.** Open **Simulation** in the bottom bar, with a test name set on the Planting Log, and run one day. It appears under "My simulation runs" and is uploaded with the log (the team sees it in `sun_day_runs_readable`). Runs hold only the design, the prediction and the scores, no typed text. Without a name, students can still play, but runs are not saved or uploaded.
- [ ] **Photos: no faces or names.** The photo help says to leave them out. Remind students before the first photo.
- [ ] **Offline is fine.** Entries made without internet show "Offline — will upload later" and upload by themselves once the device is back online. Open the app once on a connection after an offline session.
- [ ] **Removing a student.** Settings → "Remove my name and log from this device" (or Clear all data) also deletes their simulation runs, and removes their name, notes and photos from the team's copy (the runs are marked deleted there), the next time the device is online.

## Test this first: one panel running the whole system

- [ ] **One panel can run the LED, fan and pump at the same time.** Build Learn → How to connect → Full miniAgriPV system with one panel in ordinary classroom sun (not just bright noon sun). The claim is in `learn.json → connect.circuits[id="full-system"].steps[10]` and `.success`. If it doesn't work, the second troubleshooting tip suggests running the pump from a second panel (`.troubleshooting[1]`); check that this works with your kit.

## Solar panel

- [ ] **The red wire is + and the black wire is −.**
  - `components.json → components[id="solar-panel"].polarity`, `.howToConnect`, `.quickCheck`
  - Drawing leads **(code)**: `src/components/diagram/parts.tsx`, `case 'panel'`
  - Learn → How to connect: both circuits' steps in `learn.json → connect.circuits[*].steps[*].text` say "the panel's red (+) wire" and "black (−) wire".
- [ ] **Panel voltage and current.** The app never gives the panel's voltage. The resistor range (100–220 Ω) depends on it. Write down your panel's rating (for example, 6 V / 100 mA) and check the resistor item below. To show the rating to students, add a sentence to `components.json → components[id="solar-panel"].whatItDoes`.
- [ ] **Shade cuts power a lot.** `components.json → components[id="solar-panel"].watchOut`

## LED and resistor

- [ ] **The long leg is + (anode) and the short leg is − (cathode).** Some kit LEDs have legs trimmed to the same length. If yours do, change the wording to use the flat edge on the rim (−).
  - `components.json → components[id="led"].polarity`, `.howToConnect`, `.quickCheck`
  - Learn → How to connect, Full miniAgriPV system: `learn.json → connect.circuits[id="full-system"].steps` (resistor and LED steps)
  - Terminal names in the diagram's text alternative **(code)**: `src/components/diagram/geometry.ts`, `TERMINALS.led`
- [ ] **Resistor value is 100–220 Ω.** Check it is safe for your LED at your panel's voltage: R ≈ (panel volts − LED volts) ÷ 0.02 A. For a red LED (about 2 V) on a 6 V panel, that gives about 200 Ω.
  - `components.json → components[id="resistor"].name`, `.watchOut`
  - `learn.json → connect.circuits[id="full-system"].parts` ("Resistor (100–220 Ω)")
- [ ] **Resistor stripes.** The drawing shows brown–black–brown–gold (100 Ω). A 220 Ω resistor is red–red–brown–gold. **(code)** `src/components/diagram/parts.tsx`, `case 'resistor'`
- [ ] **The kit includes a resistor at all.** If the LED has one built in, edit the LED and resistor cards, and the resistor steps and diagram in `learn.json → connect.circuits[id="full-system"]`.

## DC motor and fan

- [ ] **Motor polarity: it runs either way, and swapping the clips reverses the spin.** Some motors have a + mark or a red dot. If yours does, say so.
  - `components.json → components[id="motor"].polarity`, `.quickCheck`
- [ ] **It may need a push to start.** `components.json → components[id="motor"].watchOut`, and Learn → How to connect, Panel + motor: `learn.json → connect.circuits[id="motor"].steps[3]`, `.troubleshooting[1]`
- [ ] **The motor has two metal tabs** (not wires). If it has red/black wires instead, edit `components.json → components[id="motor"].howToConnect` and the motor steps in `learn.json → connect.circuits[*].steps`.

## Water pump

- [ ] **The pump's wire colors are red (+) and black (−), and polarity matters.** Some small pumps run backwards or not at all when reversed. Others have no colored wires.
  - `components.json → components[id="pump"].polarity`, `.howToConnect`
  - Drawing leads **(code)**: `src/components/diagram/parts.tsx`, `case 'pump'`
  - Learn → How to connect: `learn.json → connect.circuits[id="full-system"].steps[8]` and `[9]` (the pump wires)
- [ ] **The pump is submersible and must not run dry.** If yours is an inline pump that sits outside the water, rewrite these.
  - `components.json → components[id="pump"].howToConnect`, `.watchOut`, `.quickCheck`
  - `learn.json → connect.circuits[id="full-system"].steps[1]` ("Put the pump all the way under water")
- [ ] **Water safety wording suits your room.** `learn.json → connect.circuits[id="full-system"].steps[0]` (`"kind": "safety"`)
- [ ] **The pump's wires are long enough to keep the clips dry.** The pump card says "Keep the clips dry." If the wires are short, add an extension clip and say so in `components.json → components[id="pump"].watchOut`.

## Alligator clips

- [ ] **The kit has red and black clips.** The clips card says to use red clips for + and black clips for −. If your clips come in other colors, change the wording or pick a color code. The drawings always show + wires red and − wires black.
  - `components.json → components[id="clips"].polarity`, and the wire-color rule at the top of Learn → How to connect: `learn.json → connect.wireRule`
  - The wiring steps in `learn.json → connect.circuits[*].steps[*].text` say "Use a red clip" or "Use a black clip".
- [ ] **Enough clips.** Learn → How to connect lists 2 clips for Panel + motor and 7 for the full system (`learn.json → connect.circuits[*].parts`). The full system also needs two clips to share one tab or wire. Check that your clips can do that.

## Simulation

- [ ] **The numbers are estimates.** The Simulation page says so. Every model number (panel sizes, how much shade they make, plant comfort temperatures, how fast the soil dries, the challenges) is in `src/sim/model.json`. Once you have measured your kit, you can tune them there. The words are in `sunday.json`.
