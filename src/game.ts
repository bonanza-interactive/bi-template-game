import * as PIXI from "pixi.js";

export class Game1 {
  app: PIXI.Application;

  constructor(container: HTMLElement, initial?: unknown) {
    this.app = new PIXI.Application({ width: 800, height: 600, backgroundColor: 0x222222 });
    container.appendChild(this.app.view as HTMLCanvasElement);

    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xff0000);
    graphics.drawRect(100, 100, 200, 200);
    graphics.endFill();

    this.app.stage.addChild(graphics);
  }

  spin() {
    console.log("Game spin triggered from wrapper UI");
  }
}

if (typeof window !== 'undefined') {
  (window as any).bi = (window as any).bi || {};
  (window as any).bi.game = Game1;
}
