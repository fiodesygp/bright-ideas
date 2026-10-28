# Facilitator checklist: verify against your real kit

The app makes specific claims about the miniAgriPV kit. Before students use it, check each item below against the parts in your kit. If something is wrong, edit the file and key shown. Text changes need no code. Items marked **(code)** live in a drawing and need a small code edit.

Paths are written as `file → JSON path`. All content files are in `src/content/`.

## Test this first: one panel running the whole system

- [ ] **One panel can run the LED, fan, and pump at the same time (Circuit 6).** This is the claim most likely to fail. Build Circuit 6 with one panel in ordinary classroom sun (not just bright noon sun) and check that all three parts work together.
  - If it works, nothing to change. The claim is in `circuits.json → circuits[id="full-system"].steps[10]` and `.success`.
  - If it doesn't, students get a **"Not enough power? Use two panels"** split setup in Circuit 6's troubleshooting. Panel A runs the pump, and panel B runs the fan and LED. Check that this split works with your kit too. It needs two panels and 7 clips. It lives in `circuits.json → circuits[id="full-system"].fallback` (`.text`, `.parts`, `.steps`, `.diagram`). The troubleshooting line that points to it is `.troubleshooting[1]`.
  - If one panel never runs all three, consider making the split setup the main Circuit 6. Move its diagram and steps into `.diagram` and `.steps`.

## Solar panel

- [ ] **The red wire is + and the black wire is −.**
  - `components.json → components[id="solar-panel"].polarity`, `.howToConnect`, `.quickCheck`
  - Every circuit's steps in `circuits.json → circuits[*].steps[*].text` say "the panel's red (+) wire" and "black (−) wire".
  - Diagram leads **(code)**: `src/components/diagram/parts.tsx`, `case 'panel'`
- [ ] **Panel voltage and current.** The app never gives the panel's voltage. The resistor range (100–220 Ω) and the claim that one panel can run several parts both depend on it. Write down your panel's rating (for example, 6 V / 100 mA) and check the resistor and power items below. To show the rating to students, add a sentence to `components.json → components[id="solar-panel"].whatItDoes`.
- [ ] **Shade cuts power a lot.** `components.json → components[id="solar-panel"].watchOut`

## LED and resistor

- [ ] **The long leg is + (anode) and the short leg is − (cathode).** Some kit LEDs have legs trimmed to the same length. If yours do, change the wording to use the flat edge on the rim (−).
  - `components.json → components[id="led"].polarity`, `.howToConnect`, `.quickCheck`
  - `circuits.json → circuits[id="led"].steps`, `circuits[id="two-parts"].steps`, `circuits[id="full-system"].steps`
  - Terminal names used in diagram alt text **(code)**: `src/components/diagram/geometry.ts`, `TERMINALS.led`
- [ ] **Resistor value is 100–220 Ω.** Check it is safe for your LED at your panel's voltage: R ≈ (panel volts − LED volts) ÷ 0.02 A. For a red LED (about 2 V) on a 6 V panel, that gives about 200 Ω.
  - `components.json → components[id="resistor"].name`, `.watchOut`
  - `circuits.json → circuits[*].parts` (the "Resistor (100–220 Ω)" entries)
- [ ] **Resistor stripes.** The drawing shows brown–black–brown–gold (100 Ω). A 220 Ω resistor is red–red–brown–gold. **(code)** `src/components/diagram/parts.tsx`, `case 'resistor'`
- [ ] **The kit includes a resistor at all.** If the LED has one built in, edit the LED and resistor cards and remove the resistor steps from the LED circuits.

## DC motor and fan

- [ ] **Motor polarity: it runs either way, and swapping the clips reverses the spin.** Some motors have a + mark or a red dot. If yours does, say so.
  - `components.json → components[id="motor"].polarity`, `.quickCheck`
  - `circuits.json → circuits[id="motor"].success`
- [ ] **It may need a push to start.** `components.json → components[id="motor"].watchOut`, `circuits.json → circuits[id="motor"].steps[3]`, `.troubleshooting`
- [ ] **The motor has two metal tabs** (not wires). If it has red/black wires instead, edit `components.json → components[id="motor"].howToConnect` and the motor steps in `circuits.json`.

## Water pump

- [ ] **The pump's wire colors are red (+) and black (−), and polarity matters.** Some small pumps run backwards or not at all when reversed. Others have no colored wires.
  - `components.json → components[id="pump"].polarity`, `.howToConnect`
  - `circuits.json → circuits[id="pump"].steps`, `circuits[id="full-system"].steps`
  - Diagram leads **(code)**: `src/components/diagram/parts.tsx`, `case 'pump'`
- [ ] **The pump is submersible and must not run dry.** If yours is an inline pump that sits outside the water, rewrite these.
  - `components.json → components[id="pump"].howToConnect`, `.watchOut`, `.quickCheck`
  - `circuits.json → circuits[id="pump"].steps[1]` and `circuits[id="full-system"].steps[1]` (the "put the pump under water" steps)
- [ ] **The pump's wires are long enough to clip above the water.** The diagrams and steps say to keep the clips out of the water. If the wires are short, add an extension clip and say so in the steps.
- [ ] **Water safety wording suits your room.** `circuits.json → circuits[id="pump"].steps[0]` and `circuits[id="full-system"].steps[0]` (both `"kind": "safety"`)

## Running several parts from the panels

- [ ] **One panel runs the fan and the LED together in weak sun (Circuit 4).** The app says the LED "may be dim" in weak sun. Test it on a cloudy day.
  - `circuits.json → circuits[id="two-parts"].steps[6]`, `.troubleshooting[4]`, `.success`
- [ ] **Two panels in parallel give more current, so the fan spins faster or starts in weaker light (Circuit 5).** This only holds if both panels have the same voltage rating. Also check that the kit includes two panels.
  - `circuits.json → circuits[id="two-panels"].steps[5]`, `.success`, `.parts`
- [ ] **The full system on one panel (Circuit 6).** See "Test this first" at the top.

## Alligator clips

- [ ] **The kit has red and black clips.** Every circuit step says "Use a red clip" or "Use a black clip". If your clips come in other colors, change the wording or pick a color code. The diagrams always draw + wires red and − wires black.
  - `components.json → components[id="clips"].polarity`
  - `circuits.json → circuits[*].steps[*].text`
- [ ] **Enough clips for each circuit.** The counts are in `circuits.json → circuits[*].parts`. Circuits 1–3 need 2–3 clips, Circuit 4 needs 5, Circuit 5 needs 4, and Circuit 6 needs 7. Circuits 4–6 also need two clips to share one tab or wire. Check that your clips can do that.
