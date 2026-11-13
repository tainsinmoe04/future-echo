import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
async function begin(page: Page) {
  await page.goto("/onboarding");await page.getByLabel("One possible version of me is…").fill("A thoughtful maker");
  await page.getByRole("button",{name:"Continue",exact:true}).click();await page.locator("input[type=month]").fill("2036-11");await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("checkbox",{name:"I am 18 or older.",exact:true}).check();await page.getByRole("button",{name:"Meet your Future Self",exact:true}).click();await expect(page.getByText(/A little strange to meet yourself here/)).toBeVisible();
}
test("tab close keeps chat and draft; a return after a day adds one local-language check-in",async({page,context})=>{
  await begin(page);const text="ဒီနေ့တော့ စိတ်ပင်ပန်းတယ်";
  await page.getByRole("textbox",{name:"Message your future self",exact:true}).fill(text);await page.getByRole("button",{name:"Send message",exact:true}).click();await expect(page.getByLabel("Message options",{exact:true})).toHaveCount(1);
  await page.getByRole("textbox",{name:"Message your future self",exact:true}).fill("Unfinished words");
  const messages=await page.locator(".echo-message p").allTextContents();await page.close();
  const next=await context.newPage();await next.goto("/now");await expect(next.getByRole("textbox",{name:"Message your future self",exact:true})).toHaveValue("Unfinished words");await expect(next.locator(".echo-message p")).toHaveText(messages);
  await next.evaluate(()=>{const key="future-echo.chat-recovery.v1",value=JSON.parse(localStorage.getItem(key)!);value.savedAt=Date.now()-25*3600000;localStorage.setItem(key,JSON.stringify(value));});await next.close();
  const returned=await context.newPage();await returned.goto("/now");await expect(returned.getByText("Check-in · written by Future Echo",{exact:true})).toHaveCount(1);await expect(returned.getByText("ဟေး၊ ဒီနေ့ရော အဆင်ပြေလား။ ဘာတွေဖြစ်ခဲ့လဲ ပြောပြချင်လား။",{exact:true})).toBeVisible();
  await returned.reload();await expect(returned.getByText("Check-in · written by Future Echo",{exact:true})).toHaveCount(1);await expect(returned.getByText("Welcome · written by Future Echo",{exact:true})).toHaveCount(1);
  expect(await returned.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(process.env.ECHO_QA_DIR)await returned.screenshot({path:path.join(process.env.ECHO_QA_DIR,`return-check-in-${test.info().project.name}.png`)});
});
test("sticker cutout preview and direct sticker/photo deletion preserve Undo",async({page})=>{
  await begin(page);await page.goto("/memory");await page.getByRole("button",{name:"Add a moment",exact:true}).click();await page.getByRole("textbox",{name:"Moment title",exact:true}).fill("My page");await page.getByRole("textbox",{name:"My words",exact:true}).fill("These words stay unchanged.");
  await page.getByRole("button",{name:"Arrange",exact:true}).click();await page.getByText("Add decorations",{exact:false}).first().click();
  const image=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;const ctx=canvas.getContext("2d")!;ctx.fillStyle="white";ctx.fillRect(0,0,64,64);ctx.fillStyle="#d02040";ctx.fillRect(16,16,32,32);return canvas.toDataURL("image/png").split(",")[1];});
  await page.getByLabel("Upload custom sticker",{exact:true}).setInputFiles({name:"sticker.png",mimeType:"image/png",buffer:Buffer.from(image,"base64")});await expect(page.getByRole("button",{name:"Use cutout",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Use cutout",exact:true}).click();const sticker=page.getByRole("group",{name:"custom sticker",exact:true});await expect(sticker).toBeVisible();
  const alpha=await sticker.locator("img").evaluate(async(node:HTMLImageElement)=>{await node.decode();const c=document.createElement("canvas");c.width=node.naturalWidth;c.height=node.naturalHeight;const ctx=c.getContext("2d")!;ctx.drawImage(node,0,0);return ctx.getImageData(0,0,1,1).data[3];});expect(alpha).toBe(0);
  if(process.env.ECHO_QA_DIR)await page.screenshot({path:path.join(process.env.ECHO_QA_DIR,`sticker-delete-${test.info().project.name}.png`)});
  await page.getByRole("button",{name:"Delete custom sticker",exact:true}).click();await expect(sticker).toHaveCount(0);await page.getByRole("button",{name:"Undo",exact:true}).click();await expect(sticker).toBeVisible();await sticker.focus();await sticker.press("Delete");await expect(sticker).toHaveCount(0);
  await page.getByRole("button",{name:"Undo",exact:true}).click();await page.getByLabel("Choose photos",{exact:true}).setInputFiles(path.resolve("public/scrapbook/study.webp"));await page.getByRole("button",{name:"Arrange",exact:true}).click();const photo=page.getByRole("group",{name:"Photo",exact:true});await photo.focus();await page.getByRole("button",{name:"Delete Photo",exact:true}).click();await expect(photo).toHaveCount(0);await page.getByRole("button",{name:"Undo",exact:true}).click();await expect(photo).toBeVisible();await expect(page.locator(".paper-original")).toHaveText("These words stay unchanged.");
  await page.getByRole("button",{name:"Done",exact:true}).click();await expect(page.getByText("Saved on this device",{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
