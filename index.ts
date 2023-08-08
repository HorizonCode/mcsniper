import { prompt } from "enquirer";
import { createSpinner } from "nanospinner";
import { format } from "./format";
import { textSync } from "figlet";
import { authenticate } from "./msauth";

let apiCheck =
  "https://api.minecraftservices.com/minecraft/profile/name/{username}/available";

let apiUpdate =
  "https://api.minecraftservices.com/minecraft/profile/name/{username}";

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

  const authMethods = ["Microsoft Account", "Authorization-Token (Bearer)"];

  const authMethod = (await prompt({
    type: "select",
    message: "Select which authentication method you want to use",
    choices: authMethods,
    name: "authmethod",
  }))["authmethod"];

  let authToken;

  if (authMethod == "Microsoft Account") {
    const msEmail = (await prompt({
      type: "input",
      name: "msemail",
      message: "Please enter your Microsoft Email!",
      validate(value) {
        return /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/
            .test(value)
          ? true
          : "Please enter a valid email!";
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
    const mcToken = authenticate(
      msEmail,
      msPassword,
      createSpinner("Waiting for authentication..."),
    );
    if (mcToken) authToken = mcToken;
    else return;
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
      return /^[a-zA-Z0-9_]{2,16}$/mg.test(value)
        ? true
        : "Invalid Minecraft Username.";
    },
  }))["username"];

  const headers = {
    "Authorization": `Bearer ${authToken}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.0.0",
    "Refferer": "https://www.minecraft.net/",
    "Origin": "https://www.minecraft.net",
  };

  apiCheck = format(apiCheck, { username: newUsername });
  apiUpdate = format(apiUpdate, { username: newUsername });

  const spinner = createSpinner("Checking Authorization-Token").start();
  try {
    const checkResult = await fetch(apiCheck, {
      headers,
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
        headers,
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
      if ("name" in changeJson) {
        checkSpinner.success({
          text: "Got desired username!",
        });
        clearInterval(interval);
      }
      if (changeResult.status == 404) {
        checkSpinner.error({
          text:
            "It appears that you dont have a active copy of Minecraft on that Account.",
        });
        console.log(JSON.stringify(changeJson, null, 2));
        clearInterval(interval);
        return;
      }
      if (
        changeResult.status == 400 || changeResult.status == 401 ||
        changeResult.status == 403
      ) {
        checkSpinner.error({
          text: "Bearer Token expired or timed out.",
        });
        console.log(JSON.stringify(changeJson, null, 2));
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
