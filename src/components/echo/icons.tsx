import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.65, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
export const BackIcon = (props: Props) => <svg {...base} {...props}><path d="m14 5-7 7 7 7" /></svg>;
export const PlusIcon = (props: Props) => <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>;
export const CloseIcon = (props: Props) => <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
export const SendIcon = (props: Props) => <svg {...base} {...props}><path d="M12 20V4m-7 7 7-7 7 7" /></svg>;
export const PhotoIcon = (props: Props) => <svg {...base} {...props}><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 6" /></svg>;
export const StarIcon = (props: Props) => <svg {...base} {...props}><path d="m12 2 3 6.7 7.3.8-5.4 5 1.6 7.2-6.5-3.6-6.5 3.6 1.6-7.2-5.4-5 7.3-.8Z" /></svg>;
export const BookIcon = (props: Props) => <svg {...base} {...props}><path d="M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v16c-4-1-7 0-9 2-2-2-5-3-9-2Z" /></svg>;
export const ClipIcon = (props: Props) => <svg {...base} {...props}><path d="m8 13 6-7a3 3 0 0 1 4 4l-8 9a5 5 0 0 1-7-7l8-9a4 4 0 0 1 6 5l-8 9a2 2 0 0 1-3-3l7-8" /></svg>;
export const MoreIcon = (props: Props) => <svg {...base} {...props}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
export const SettingsIcon = (props: Props) => <svg {...base} {...props}><path d="m9 3 .8-2h4.4l.8 2 2 .9 2-.6 2.2 3.8-1.5 1.6.2 2.3 1.6 1.5-2.2 3.8-2.1-.4-2 1-.8 2H10l-.8-2-2-1-2.1.4L2.9 13l1.6-1.5.2-2.3-1.5-1.6L5.4 3.8l2 .6Z" transform="translate(0 2) scale(.96)"/><circle cx="12" cy="12" r="3" /></svg>;
export function OrbitIcon(props: Props) {
  return <svg {...base} viewBox="0 0 48 48" width="44" height="44" {...props}><ellipse cx="24" cy="24" rx="11" ry="23" transform="rotate(42 24 24)" strokeWidth=".8" /><circle cx="37.7" cy="8.5" r="3.6" fill="currentColor" stroke="none" /><circle cx="10.3" cy="39.5" r="2.5" fill="currentColor" stroke="none" /></svg>;
}
