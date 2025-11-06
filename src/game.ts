import * as PIXI from "pixi.js";
import { Application } from "pixi.js";
// Bind at runtime from wrapper's global
let bi: any;

interface IInitialSize {
    width: number;
    height: number;
    scale: number;
    baseWidth: number;
    baseHeight: number
}

export class Game {
    private app!: Application;
    private container: HTMLElement;

    private width: number = 0;
    private height: number = 0;

    private logText?: PIXI.Text;
    private logField?: PIXI.Container;

    constructor(container: HTMLElement, initialSize: IInitialSize) {
        if (typeof window === 'undefined' || !(window as any).bi) {
            console.error("Global 'bi' not available; aborting game initialization.");
            // @ts-ignore
            this.container = undefined;
            this.width = 0;
            this.height = 0;
            return;
        }
        bi = (window as any).bi;
        if (!container) {
            console.error("Game container not found!");
            // @ts-ignore
            this.container = undefined;
            this.width = 0;
            this.height = 0;
            return;
        }

        this.container = container;
        this.width = initialSize.width;
        this.height = initialSize.height;

        this.initializePixiApp();
        this.waitForBiAndRegister();

        this.onScaleResize(initialSize)
    }

    private initializePixiApp() {
        this.app = new Application({
            resolution: 1,
            width: this.width,
            height: this.height,
            backgroundColor: 0xf0000f,
        });

        // @ts-ignore - expose for Pixi devtools
        globalThis.__PIXI_APP__ = this.app;

        // @ts-ignore
        this.container.appendChild(this.app.view);
    }

    private registerEventHandlers() {
        const b: any = (typeof window !== 'undefined') ? (window as any).bi : undefined;
        if (!b || !b.casino || !b.channel) {
            return; // quietly skip; waitForBiAndRegister will retry
        }
        b.casino.channel.subscribe(b.channel.initGame, this.onGameInitStart);
        b.casino.channel.subscribe(b.channel.startGame, this.onServerConfig);
        b.casino.channel.subscribe(b.channel.roundStarted, this.onRoundStarted);
        b.casino.channel.subscribe(b.channel.betDeclined, this.onBetDeclined);
        b.casino.channel.subscribe(b.channel.betAccepted, this.onBetAccepted);
        b.casino.channel.subscribe(b.channel.scaleResize, this.onScaleResize);
        b.casino.channel.subscribe(b.channel.freeRoundReult, this.handleFreeRoundResult);
    }

    private waitForBiAndRegister(retries: number = 20, delayMs: number = 100) {
        const tryRegister = () => {
            const b: any = (typeof window !== 'undefined') ? (window as any).bi : undefined;
            if (b && b.casino && b.channel) {
                this.registerEventHandlers();
                return;
            }
            if (retries > 0) {
                setTimeout(() => {
                    this.waitForBiAndRegister(retries - 1, delayMs);
                }, delayMs);
            } else {
                console.error("'bi' not available after waiting; event subscriptions not registered.");
            }
        };
        tryRegister();
    }

    private onScaleResize = (payload: IInitialSize) => {
        if (!this.app || !payload) return;

        const width = payload.width;
        const height = payload.height;
        this.applyScaleAndPosition(width, height);
    };

    private applyScaleAndPosition(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.app.renderer.resize(width, height);
        
        if (this.logField) {
            this.repositionLogField();
        }
    }

    private createGradientBackground() {
        // Use renderer dimensions for 100% coverage
        const width = this.app.renderer.width;
        const height = this.app.renderer.height;
        
        const gradientTexture = createGradientTexture(
            width,
            height,
            "#fff000",
            "#000fff"
        );

        const gradientBackground = new PIXI.Sprite(gradientTexture);
        gradientBackground.name = "background";
        gradientBackground.x = 0;
        gradientBackground.y = 0;
        gradientBackground.width = width;
        gradientBackground.height = height;
        this.app.stage.addChildAt(gradientBackground, 0);
    }

    private createLogField() {
        const fieldWidth = this.width * 0.30;
        const fieldHeight = this.height;
        const padding = 10;

        const logField = new PIXI.Container();
        logField.x = fieldWidth / 2;
        logField.y = this.height / 2;

        const logBg = new PIXI.Graphics();
        logBg.drawRoundedRect(
            -fieldWidth / 2,
            -fieldHeight / 2,
            fieldWidth,
            fieldHeight,
            12
        );
        logBg.endFill();
        logField.addChild(logBg);

        const logText = new PIXI.Text("Logger", {
            fontSize: 20,
            fill: 0x000000,
            align: "left",
            wordWrap: true,
            wordWrapWidth: fieldWidth - padding * 2,
        });
        logText.anchor.set(0, 0);
        logText.x = -fieldWidth / 2 + padding;
        logText.y = -fieldHeight / 2 + 3;

        logField.addChild(logText);
        this.app.stage.addChild(logField);

        this.logText = logText;
        this.logField = logField;
    }

    private repositionLogField() {
        if (!this.logField || !this.logText) return;

        const fieldWidth = this.width * 0.30;
        const fieldHeight = this.height;
        const padding = 10;

        this.logField.x = fieldWidth / 2;
        this.logField.y = this.height / 2;

        // Redraw the background with new dimensions
        const logBg = this.logField.children[0] as PIXI.Graphics;
        logBg.clear();
        // logBg.beginFill(0xffffff, 0.09);
        logBg.drawRoundedRect(
            -fieldWidth / 2,
            -fieldHeight / 2,
            fieldWidth,
            fieldHeight,
            12
        );
        logBg.endFill();

        // Update text properties
        this.logText.style.wordWrapWidth = fieldWidth - padding * 2;
        this.logText.x = -fieldWidth / 2 + padding;
        this.logText.y = -fieldHeight / 2 + 3;
    }

    private appendLine = (msg: string) => {
        if (!this.logText) return;
        this.logText.text = (this.logText.text ? this.logText.text + "\n" : "") + msg;
    };

    private onGameInitStart = async ( data: any) => {
        bi.casino.channel.unsubscribe(bi.channel.initGame, this.onGameInitStart);
        
        // Create gradient background and log field when init starts
        this.createLogField();

        this.appendLine('on -> ' + bi.channel.initGame);
        this.appendLine('data => ' + JSON.stringify(data) );

        await this.delay(1500);
        bi.casino.channel.publish(bi.channel.gameReady, {
            gameTitle: "Template Game"
        });
        this.appendLine(bi.channel.gameReady);
        await this.delay(1500);
        bi.casino.channel.publish(bi.channel.gameLoaded);
        this.appendLine(bi.channel.gameLoaded);
    };

    private onServerConfig = async (data: any) => {
        bi.casino.channel.unsubscribe(bi.channel.startGame, this.onServerConfig);

        const onBrokenPopupHide = () => {
            bi.casino.channel.unsubscribe(bi.channel.hideError, onBrokenPopupHide);
            this.startFeatureFlow( data.gameInfoData.restoreResponse );
        }

        if ( data.gameInfoData.restoreResponse) {
            bi.casino.channel.subscribe(bi.channel.hideError, onBrokenPopupHide);
        }

        this.appendLine('on -> ' + bi.channel.startGame);
        this.appendLine(`data => ${ Object.entries(data).map(([key, value]) => `\t\t${key} ${value}`).join("\n") }`);

        await this.delay(1500);
        this.createGradientBackground();
        bi.casino.channel.publish(bi.channel.gameStarted);
        this.appendLine(bi.channel.gameStarted);

    };

    private delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    private onRoundStarted = ( data : any) => {
        if (this.logText) {
            this.logText.text = "";
        }
        this.appendLine('on -> ' + bi.channel.roundStarted);
        this.appendLine('data => ' + JSON.stringify(data) );
    };

    private onBetDeclined = () => {
        this.appendLine('on -> ' + bi.channel.betDeclined);
    }

    private onBetAccepted = async (data: any) => {
        // Ensure log field exists
        if (!this.logText) {
            this.createLogField();
        }

        const result = Array.isArray(data?.events.result) ? data?.events.result : [data?.events.result]
        const reels =  result[0].reels; 
        const totalWin = data?.events.state.totalWin;
        const win = result.reduce((acc:number, item: any) => acc + parseFloat(String(item?.win?.total || "0").trim()), 0);

        this.appendLine('on -> ' + bi.channel.betAccepted);
        this.appendLine(`\t\t data => ${ data.roundId }`);
        
        const rows = reels[0].length;
        const cols = reels.length;

        for (let row = 0; row < rows; row++) {
            const line = reels.map((reel: any) => reel[row].smbID).join("\t\t");
            this.appendLine("\t\t" + line);
        }
        this.appendLine(`\t\t win => ${ win }`);
        this.appendLine(`\t\t totalWin => ${ totalWin }`);

        await this.delay(1000);
        bi.casino.channel.publish(bi.channel.betAcknowledged);
        this.appendLine(bi.channel.betAcknowledged);

        await this.delay(1000);
        bi.casino.channel.publish(bi.channel.gameRoundStarted, data);
        this.appendLine(bi.channel.gameRoundStarted);

        await this.delay(1000);
        bi.casino.channel.publish(bi.channel.resultDisplay, { win: totalWin * 100 });
        this.appendLine(bi.channel.resultDisplay);

        const expectedAction = data.events?.state?.expectedActions;
        if (expectedAction[0] === 'spin') {
            await this.publishGameRoundCompleted(data);
        } else {
            await this.startFeatureFlow(data.events);
        }
    };

    private startFeatureFlow = async (data: any) => {

        bi.casino.channel.publish(bi.channel.featureEnter, { featureName: "freespin" });
        const awarded: number = data.state?.totalRSAwarded;
        bi.casino.channel.publish(bi.channel.updateFeatureCounter, { counterValue: awarded, totalValue: awarded });

        this.appendLine(bi.channel.featureEnter);
        await this.featureRoundStart( data);
        await this.delay(1000);
    };

    private featureRoundStart = async (data: any) => {
        if (this.logText) {
            this.logText.text = "";
        }
        
        await this.delay(1000);
        bi.casino.channel.publish(bi.channel.featureRoundStarted, { uistate: "freespins", gameMode: "" });
        this.appendLine(bi.channel.featureRoundStarted);
        bi.casino.channel.publish(bi.channel.freeRoundRequest, { action: data.state?.expectedActions[0] });
    };

    private handleFreeRoundResult = async (data: any) => {

        const state = data.events?.state; 
        const left: number = state.freespinsRemaining; 

        const result = Array.isArray(data?.events.result) ? data?.events.result : [data?.events.result]
        const reels =  result[0].reels; 
        const totalWin = data?.events.state.totalWin;

        const win = result.reduce((acc:number, item: any) => acc + parseFloat(String(item?.win?.total || "0").trim()), 0);

		    const rows = reels[0].length;
        
        for (let row = 0; row < rows; row++) {
            const line = reels.map((reel: any) => reel[row].smbID).join("\t\t");
            this.appendLine("\t\t" + line);
        }

		    this.appendLine(`\t\t win => ${ win }`);
		    this.appendLine(`\t\t totalWin => ${ totalWin }`);

        bi.casino.channel.publish(bi.channel.updateFeatureCounter, { counterValue: left, totalValue: state.totalFSAwarded });
        this.appendLine(bi.channel.updateFeatureCounter + ` -> ${left}`);
        await this.delay(500);

        bi.casino.channel.publish(bi.channel.updateFeatureTotalWin, { totalWinAmount: state.totalWin * 100});
        this.appendLine(bi.channel.updateFeatureTotalWin);
        await this.delay(500);

        bi.casino.channel.publish(bi.channel.featureRoundCompleted, { winAmount: win * 100 });
        this.appendLine(bi.channel.featureRoundCompleted);
        await this.delay(500);

        if (left > 0) {
            await this.featureRoundStart(data.events );
        } else {
            bi.casino.channel.publish(bi.channel.featureExit, { winAmount: state.totalWin * 100 });
            this.appendLine(bi.channel.featureExit);
            await this.publishGameRoundCompleted(data);
        }
    };

    private publishGameRoundCompleted = async (data: any) => {
        await this.delay(1000);
        bi.casino.channel.publish(bi.channel.gameRoundCompleted, data);
        this.appendLine(bi.channel.gameRoundCompleted);
    };
}

function createGradientTexture(width: number, height: number, color1: string, color2: string) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx: any = canvas.getContext("2d");

    // Create linear gradient (left → right)
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, color1); // start color
    gradient.addColorStop(1, color2); // end color

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    return PIXI.Texture.from(canvas);
}

if (typeof window !== 'undefined') {
  (window as any).bi = (window as any).bi || {};
  (window as any).bi.game = Game;
}
