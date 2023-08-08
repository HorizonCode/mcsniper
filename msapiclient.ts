import { Spinner, createSpinner } from "nanospinner";

interface APIClientOptions {
  apiUpdate: string;
  headers: Record<string, string>;
}

export class MSAPIClient {
  private tries: number = 0;
  private checkSpinner: Spinner;
  private interval: NodeJS.Timeout;

  constructor(private options: APIClientOptions) {
    this.checkSpinner = createSpinner(
      `Trying to get Username... (${this.tries} retries)`,
    ).start();

    this.interval = setInterval(this.fetchAndUpdate.bind(this), 1000 * 7);
  }

  private async fetchAndUpdate() {
    try {
      const changeResult = await fetch(this.options.apiUpdate, {
        headers: this.options.headers,
        method: "GET",
      });

      this.tries += 1;

      const responseType = changeResult.headers.get("Content-Type") ??
        undefined;

      if (!responseType || !responseType.includes("json")) {
        clearInterval(this.interval);
        this.checkSpinner.error({
          text: "API Request failed, non-json response",
        });
        console.log(changeResult.headers.get("Content-Type"));
        return;
      }

      const changeJson = await changeResult.json();

      if ("name" in changeJson) {
        this.checkSpinner.success({
          text: "Got desired username!",
        });
        clearInterval(this.interval);
      }

      if (changeResult.status == 404) {
        clearInterval(this.interval);
        this.checkSpinner.error({
          text:
            "It appears that you don't have an active copy of Minecraft on that Account.",
        });
        console.log(JSON.stringify(changeJson, null, 2));
        return;
      }

      if (
        changeResult.status == 400 ||
        changeResult.status == 401 ||
        changeResult.status == 403
      ) {
        clearInterval(this.interval);
        this.checkSpinner.error({
          text: "Bearer Token expired or timed out.",
        });
        console.log(JSON.stringify(changeJson, null, 2));
        return;
      }

      this.checkSpinner.update({
        text: `Trying to get Username... (${this.tries} retries)`,
      });
    } catch (err) {
      this.checkSpinner.error({
        text: "API Request failed.",
      });
      console.log(err);
    }
  }
}
