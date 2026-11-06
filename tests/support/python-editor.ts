// Observe the real visible CodeMirror document, never a hidden input mirror.
import { expect, type Locator, type Page } from "@playwright/test";

export async function fillPythonCode(editor: Locator, text: string) {
  await expectPythonEditable(editor, true);
  await editor.focus();
  await editor.press("ControlOrMeta+a");
  await editor.page().keyboard.insertText(text);
  await editor
    .page()
    .evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
}

export async function pythonEditorText(editor: Locator): Promise<string> {
  return (await editor.locator(".cm-line").allTextContents()).join("\n");
}
export async function expectPythonCode(editor: Locator, text: string) {
  await expect.poll(() => pythonEditorText(editor)).toBe(text);
}
export async function expectPythonEditable(editor: Locator, editable: boolean) {
  await expect(editor).toHaveAttribute("contenteditable", String(editable));
  await expect(editor).toHaveAttribute("aria-disabled", String(!editable));
}

export async function pointerActivate(page: Page, action: Locator) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const geometry = await action.evaluate((element) => {
      const r = element.getBoundingClientRect(),
        x = r.left + r.width / 2,
        y = r.top + r.height / 2;
      let visible = x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight;
      let scroll: { x: number; y: number } | null = null;
      for (let p = element.parentElement; p; p = p.parentElement) {
        const style = getComputedStyle(p),
          bounds = p.getBoundingClientRect();
        if (/auto|scroll|hidden|clip/.test(style.overflowY))
          visible &&= y >= bounds.top && y <= bounds.bottom;
        if (/auto|scroll|hidden|clip/.test(style.overflowX))
          visible &&= x >= bounds.left && x <= bounds.right;
        if (
          !scroll &&
          /auto|scroll/.test(style.overflowY) &&
          p.scrollHeight > p.clientHeight
        )
          scroll = {
            x: Math.min(innerWidth - 2, bounds.right - 5),
            y:
              (Math.max(0, bounds.top) + Math.min(innerHeight, bounds.bottom)) /
              2,
          };
      }
      const hit = document.elementFromPoint(x, y);
      return {
        visible: visible && !!hit && element.contains(hit),
        x,
        y,
        scroll: scroll ?? { x: innerWidth - 2, y: innerHeight / 2 },
      };
    });
    if (geometry.visible) {
      await page.mouse.click(geometry.x, geometry.y);
      return;
    }
    await page.mouse.move(geometry.scroll.x, geometry.scroll.y);
    await page.mouse.wheel(0, 400);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  throw new Error(
    "Action has no pointer-reachable center after real scrolling",
  );
}
