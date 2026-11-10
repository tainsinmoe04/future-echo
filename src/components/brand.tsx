import Link from "next/link";
import Image from "next/image";
export function Brand({ href="/" }:{ href?:string }) { return <Link href={href} aria-label="Future Echo home" className="focus-ring inline-flex items-center gap-2.5 rounded-lg font-display text-base font-bold tracking-[-.035em]"><Image src="/brand/future-echo-across.png" alt="" width={40} height={40} className="rounded-lg" />Future Echo</Link>; }
