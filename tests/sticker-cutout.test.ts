import test from "node:test";
import assert from "node:assert/strict";
import { removeBorderBackground } from "../src/lib/sticker-cutout";
test("cutout removes border-connected background without changing the original",()=>{
 const input=new Uint8ClampedArray(5*5*4).fill(255);
 for(let y=1;y<4;y++)for(let x=1;x<4;x++){const i=(y*5+x)*4;input[i]=180;input[i+1]=20;input[i+2]=40;}
 const middle=(2*5+2)*4;input[middle]=255;input[middle+1]=255;input[middle+2]=255;
 const output=removeBorderBackground(input,5,5);
 assert.equal(output[3],0);assert.equal(output[(1*5+1)*4+3],255);assert.equal(output[middle+3],255);assert.equal(input[3],255);
});
test("cutout rejects resource-unsafe dimensions",()=>{
 assert.throws(()=>removeBorderBackground(new Uint8ClampedArray(4),2048,2048));
 assert.throws(()=>removeBorderBackground(new Uint8ClampedArray(0),0,0));
});
