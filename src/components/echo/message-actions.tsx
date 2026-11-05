"use client";
import {useEffect,useRef} from "react";
export function MessageActions({onSave,onLeave,disabled=false}:{onSave:(trigger:HTMLElement)=>void;onLeave:()=>void;disabled?:boolean}) {
  const root=useRef<HTMLDetailsElement>(null),trigger=useRef<HTMLElement>(null);
  useEffect(()=>{const close=(event:PointerEvent)=>{if(root.current?.open&&!root.current.contains(event.target as Node))root.current.open=false;};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close);},[]);
  return <details className="echo-message-options" ref={root} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();if(root.current)root.current.open=false;trigger.current?.focus();}}}>
    <summary ref={trigger} aria-label="Message options">⋯</summary>
    <div className="echo-message-options-panel"><button disabled={disabled} onClick={()=>{if(root.current)root.current.open=false;if(trigger.current)onSave(trigger.current);}}>Save this moment</button><button onClick={()=>{if(root.current)root.current.open=false;onLeave();}}>Leave it here</button></div>
  </details>;
}
