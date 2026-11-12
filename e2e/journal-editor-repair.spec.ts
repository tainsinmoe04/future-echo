import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

async function begin(page: Page) {
  await page.goto("/onboarding");
  await page.getByLabel("One possible version of me is…").fill("A careful, curious maker");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "I am 18 or older.", exact: true }).check();
  await page.getByRole("button", { name: /^(Meet your Future Self|Continue on this device without AI)$/, exact: true }).click();
  await page.getByRole("textbox", { name: "Message your future self", exact: true }).waitFor();
  await page.getByRole("button", { name: "Add a personal moment", exact: true }).click();
  await page.getByRole("textbox", { name: "Moment title", exact: true }).fill("Little beginnings");
  await page.getByRole("textbox", { name: "My words", exact: true }).fill("These are my words, kept exactly as written.");
}
async function evidence(page: Page, name: string) {
  if (process.env.ECHO_QA_DIR) await page.screenshot({ path: path.join(process.env.ECHO_QA_DIR, `${name}-${test.info().project.name}.png`) });
}
async function focusReturn(page: Page) {
  const verified = page.waitForResponse("**/api/auth/session");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await verified;
  await expect(page.locator(".account-scope-checking")).toHaveCount(0);
}

test("native sticker chooser, focus return and cutout preserve the editor and saved upload", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await begin(page);
  await page.getByRole("button", { name: "Arrange", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Add decorations" }).click();
  const image = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = c.height = 64; const ctx = c.getContext("2d")!; ctx.fillStyle="white"; ctx.fillRect(0,0,64,64); ctx.fillStyle="#48664b"; ctx.fillRect(16,16,32,32); return c.toDataURL().split(",")[1]; });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload your own sticker", exact: true }).click();
  await (await chooser).setFiles({ name:"my-sticker.png", mimeType:"image/png", buffer:Buffer.from(image,"base64") });
  await focusReturn(page);
  await expect(page.getByRole("button", { name:"Use cutout", exact:true })).toBeEnabled();
  await focusReturn(page);
  await page.getByRole("button", { name:"Use cutout", exact:true }).click();
  const sticker = page.getByRole("group", { name:"custom sticker", exact:true });
  await expect(sticker).toBeVisible();
  await sticker.scrollIntoViewIfNeeded(); await evidence(page,"compact-sticker");
  // Clockwise direct manipulation must match the pointer,
  // including the sticker's original 8-degree rotation.
  await sticker.focus(); const box = await sticker.boundingBox(); expect(box).not.toBeNull();
  const handle = page.getByRole("button", { name:"Rotate custom sticker", exact:true });
  const h = await handle.boundingBox(); expect(h).not.toBeNull();
  const center = { x:box!.x+box!.width/2, y:box!.y+box!.height/2 };
  const dx=h!.x+h!.width/2-center.x, dy=h!.y+h!.height/2-center.y;
  await page.mouse.move(center.x+dx,center.y+dy); await page.mouse.down();
  const angle=Math.PI/6;
  await page.mouse.move(center.x+dx*Math.cos(angle)-dy*Math.sin(angle),center.y+dx*Math.sin(angle)+dy*Math.cos(angle),{steps:8});await page.mouse.up();
  const rotation = await sticker.evaluate(el => { const m=new DOMMatrix(getComputedStyle(el).transform);return Math.atan2(m.b,m.a)*180/Math.PI; });
  expect(rotation).toBeGreaterThan(30); expect(rotation).toBeLessThan(46);
  const upright = await handle.evaluate(el => { const a=new DOMMatrix(getComputedStyle(el).transform), b=new DOMMatrix(getComputedStyle(el.parentElement!).transform), c=b.multiply(a); return [c.a,c.b,c.c,c.d]; });
  expect(upright[0]).toBeCloseTo(1,2);expect(upright[1]).toBeCloseTo(0,2);expect(upright[2]).toBeCloseTo(0,2);expect(upright[3]).toBeCloseTo(1,2);
  expect(await handle.evaluate(el=>getComputedStyle(el,"::before").width)).toBe("26px");
  await page.getByRole("button",{name:"Undo",exact:true}).click();
  await expect(sticker).toHaveCSS("transform",/matrix/);
  await sticker.focus();await page.getByRole("button",{name:"Delete custom sticker",exact:true}).click();await expect(sticker).toHaveCount(0);
  await page.getByRole("button",{name:"Undo",exact:true}).click();await expect(sticker).toBeVisible();
  await page.getByRole("button", { name:"Done", exact:true }).click();
  await expect(page.getByText("Saved on this device",{exact:true})).toBeVisible();
  await page.reload();await page.getByRole("button",{name:"Open Your Space",exact:true}).click();await page.getByRole("button",{name:"Open book",exact:true}).click();
  await expect(page.locator(".custom-sticker img")).toHaveCount(1);await expect(page.locator(".paper-original")).toHaveText("These are my words, kept exactly as written.");
  expect(errors).toEqual([]);
});

test("cover template preview matches editable artwork and every text layer persists", async ({ page }) => {
  const errors: string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await begin(page);await page.getByRole("button",{name:"Done",exact:true}).click();await page.getByRole("button",{name:"Back to Your Space",exact:true}).click();
  await page.getByRole("button",{name:/Customize \d{4} book/}).click();
  const cover=page.locator(".journal-book-designer > .journal-cover");
  for (const name of ["Lace & letters","Midnight keepsake","Poetry journal"]) {
    const option=page.getByRole("button",{name:new RegExp(name)});
    const expected=await option.locator(".journal-cover").evaluate(el=>({ objects:Array.from(el.querySelectorAll("[data-object]")).map(n=>[n.getAttribute("data-object"),n.textContent]), images:Array.from(el.querySelectorAll("img")).map(n=>n.getAttribute("src")) }));
    await option.click();
    expect(await cover.evaluate(el=>({ objects:Array.from(el.querySelectorAll("[data-object]")).map(n=>[n.getAttribute("data-object"),n.textContent]), images:Array.from(el.querySelectorAll("img")).map(n=>n.getAttribute("src")) }))).toEqual(expected);
  }
  await page.getByRole("button",{name:/Lace & letters/}).click();
  for (const name of ["Cover title","Cover subtitle","Cover year","ribbon-key cover sticker","lace-trim cover sticker"]) {
    const object=cover.getByRole("group",{name,exact:true});await object.focus();await object.press("ArrowRight");await object.press("]");
  }
  await cover.scrollIntoViewIfNeeded();
  const lace=cover.getByRole("group",{name:"lace-trim cover sticker",exact:true});
  const bounds=await cover.boundingBox();
  for(const control of ["Rotate lace-trim cover sticker","Delete lace-trim cover sticker"]){
    const button=cover.getByRole("button",{name:control,exact:true});const box=await button.boundingBox();
    expect(box!.y+box!.height/2).toBeGreaterThan(bounds!.y);expect(box!.y+box!.height/2).toBeLessThan(bounds!.y+bounds!.height);
  }
  expect(await lace.evaluate(el=>el.clientWidth/el.clientHeight)).toBeCloseTo(3,0);
  await evidence(page,"editable-cover");
  const transforms=await cover.locator("[data-object]").evaluateAll(xs=>xs.map(el=>[el.getAttribute("data-object"),(el as HTMLElement).style.transform]));
  await page.getByRole("button",{name:"Done",exact:true}).click();await expect(page.getByText("Saved on this device",{exact:true})).toBeVisible();await page.reload();
  await page.getByRole("button",{name:"Open Your Space",exact:true}).click();
  const saved=page.locator(".journal-open-cover .journal-cover");
  expect(await saved.locator("[data-object]").evaluateAll(xs=>xs.map(el=>[el.getAttribute("data-object"),(el as HTMLElement).style.transform]))).toEqual(transforms);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("page title, date, words and note are independently movable", async ({page})=>{
  await begin(page);await page.getByRole("textbox",{name:"My Note · optional",exact:true}).fill("A note beside my words.");await page.getByRole("button",{name:"Arrange",exact:true}).click();
  for(const name of ["Page title","Page date","My words","My Note"]){const object=page.getByRole("group",{name,exact:true});await object.focus();await object.press("ArrowRight");await object.press("ArrowDown");const moved=await object.evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform),paper=el.closest<HTMLElement>(".echo-paper")!;return {x:m.e/paper.clientWidth,y:m.f/paper.clientHeight};});expect(moved.x).toBeCloseTo(0.01,4);expect(moved.y).toBeCloseTo(0.01,4);}
  await page.getByRole("button",{name:"Done",exact:true}).click();await expect(page.getByText("Saved on this device",{exact:true})).toBeVisible();await expect(page.locator(".paper-original")).toHaveText("These are my words, kept exactly as written.");
});
