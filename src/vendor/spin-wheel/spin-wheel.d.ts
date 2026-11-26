// Public browser API used by OHANA · spin-wheel 5.0.2
export class Wheel {
  constructor(container: HTMLElement, options: {
    items: {label:string; backgroundColor:string; labelColor:string}[];
    isInteractive:boolean; radius:number; borderColor:string; borderWidth:number;
    lineColor:string; lineWidth:number; itemLabelFont:string; pixelRatio:number;
    onRest:()=>void;
  });
  spinToItem(index:number, duration:number, center:boolean, turns:number):void;
  remove():void;
}
