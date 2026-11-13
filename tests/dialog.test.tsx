import "./fixtures/component-env";
import test from "node:test";
import assert from "node:assert/strict";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EchoDialog } from "@/components/echo/dialog";

test("Escape, backdrop clicks and programmatic close drive EchoDialog", (t) => {
  t.after(cleanup);
  let closes = 0;
  const onClose = () => { closes += 1; };
  const { rerender } = render(
    <EchoDialog open onClose={onClose} label="Confirm discard"><p>Confirm the discard?</p></EchoDialog>
  );
  const dialog = document.querySelector("dialog") as HTMLDialogElement;
  assert.equal(dialog.open, true, "open dialogs use the modal top layer");
  assert.equal(dialog.getAttribute("aria-label"), "Confirm discard");

  // Browsers fire a non-bubbling, cancelable "cancel" event on Escape.
  const escape = new window.Event("cancel", { cancelable: true });
  const notPrevented = dialog.dispatchEvent(escape);
  assert.equal(notPrevented, false, "Escape must stay preventable");
  assert.equal(closes, 1, "Escape closes exactly once");

  // Backdrop (the dialog element itself) closes; clicks on content do not.
  fireEvent.click(dialog);
  assert.equal(closes, 2, "a backdrop click closes");
  fireEvent.click(screen.getByText("Confirm the discard?"));
  assert.equal(closes, 2, "content clicks never close");

  rerender(
    <EchoDialog open={false} onClose={onClose} label="Confirm discard"><p>Confirm the discard?</p></EchoDialog>
  );
  assert.equal(dialog.open, false, "closing the prop closes the element");
  assert.equal(closes, 2, "programmatic close does not report Escape");
});
