import { prompt } from "enquirer";
import { createSpinner } from "nanospinner";
import { format } from "./format";
import { textSync } from "figlet";
import { Authflow, Titles } from 'prismarine-auth';

let apiCheck =
  "https://api.minecraftservices.com/minecraft/profile/name/{username}/available";

let apiUpdate =
  "https://api.minecraftservices.com/minecraft/profile/name/{name}";

process.emitWarning = (warning, arg, ...rest) => {
  if (arg === "ExperimentalWarning") return; // kys fetch
  return process.emitWarning(warning, arg, ...rest);
};

(async () => {
  console.log(
    textSync("mcsniper", {
      font: "Larry 3D 2",
      horizontalLayout: "default",
      verticalLayout: "default",
      whitespaceBreak: false,
    }),
  );

  const authMethods = ["Micosoft Account", "Authorization-Token (Bearer)"];

  const authMethod = (await prompt({
    type: "select",
    message: "Select which authentication method you want to use",
    choices: authMethods,
    name: "authmethod"
  }))["authmethod"];

  let authToken;

  if (authMethod == "Micosoft Account") {
    const msEmail = (await prompt({
      type: "input",
      name: "msemail",
      message: "Please enter your Microsoft Email!",
      validate(value) {
        return value.length > 0 && value.includes("@") ? true : "Please enter a valid email!";
      },
    }))["msemail"];
    const msPassword = (await prompt({
      type: "password",
      name: "msemail",
      message: "Please enter your Microsoft Password!",
      validate(value) {
        return value.length > 0;
      },
    }))["msemail"];
    const authflow = new Authflow(msEmail, undefined, {
      flow: 'live',
      password: msPassword,
      authTitle: Titles.MinecraftJava

    });
    const mcToken = await authflow.getMinecraftJavaToken();
    if (mcToken.token) {
      authToken = mcToken.token;
    }
  } else {
    authToken = (await prompt({
      type: "password",
      name: "authorization-token",
      message: "Please input your Authorization-Token!",
    }))["authorization-token"];
  }

  const newUsername = (await prompt({
    type: "input",
    name: "username",
    message: "Please input your desired Username!",
    validate(value) {
      return value.length > 0;
    },
  }))["username"];

  apiCheck = format(apiCheck, { username: newUsername });
  apiUpdate = format(apiUpdate, { username: newUsername });

  const spinner = createSpinner("Checking Authorization-Token").start();
  try {
    const checkResult = await fetch(apiCheck, {
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.0.0",
        "Refferer": "https://www.minecraft.net/",
        "Origin": "https://www.minecraft.net",
      },
      method: "GET",
    });
    if (checkResult.status != 200) {
      spinner.error({
        text: "Authorization-Token not valid or expired!",
      });
      return;
    }
    spinner.success({
      text: "Authorization-Token valid!",
    });
    let tries = 0;
    const checkSpinner = createSpinner(
      `Trying to get Username... (${tries} times tried)`,
    ).start();
    const interval = setInterval(async () => {
      const changeResult = await fetch(apiUpdate, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.0.0",
          "Refferer": "https://www.minecraft.net/",
          "Origin": "https://www.minecraft.net",
        },
        method: "GET",
      });
      tries = tries + 1;
      if (!changeResult.headers.get("Content-Type").includes("json")) {
        clearInterval(interval);
        checkSpinner.error({
          text: "API Request failed, non json response",
        });
        console.log(changeResult.headers.get("Content-Type"));
        return;
      }
      const changeJson = await changeResult.json();
      if (!("errorMessage" in changeJson) && !("details" in changeJson)) {
        checkSpinner.error({
          text: "Bearer Token expired or timed out.",
        });
        console.log(JSON.stringify(changeJson, null, 2));
        clearInterval(interval);
        return;
      }
      if (!("errorMessage" in changeJson)) {
        checkSpinner.success({
          text: "Got no error, this could mean you got your Username!",
        });
        clearInterval(interval);
        return;
      }
      checkSpinner.update({
        text: `Trying to get Username... (${tries} times tried)`,
      });
    }, 1000 * 7);
  } catch (err) {
    spinner.error({
      text: "API Request failed.",
    });
    console.log(err);
  }
})();
