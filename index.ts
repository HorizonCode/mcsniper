import { prompt } from "enquirer";
import { createSpinner } from "nanospinner";
import { format } from "./format";
import { textSync } from "figlet";
import { authenticate } from "./msauth";
import { MSAPIClient } from "./MSAPIClient";

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

  const { authMethod }: Record<string, string> = await prompt({
    type: "select",
    message: "Select which authentication method you want to use",
    choices: authMethods,
    name: "authMethod",
  });

  let authToken: string;

  if (authMethod == "Microsoft Account") {
    const { msEmail, msPassword }: Record<string, string> = await prompt([{
      type: "input",
      name: "msEmail",
      message: "Please enter your Microsoft Email!",
      validate(value) {
        return /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/
            .test(value)
          ? true
          : "Please enter a valid email!";
      },
    }, {
      type: "password",
      name: "msPassword",
      message: "Please enter your Microsoft Password!",
      validate(value) {
        return value.length > 0;
      },
    }]);

    const mcToken = await authenticate(
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

  const { newUsername }: Record<string, string> = await prompt({
    type: "input",
    name: "newUsername",
    message: "Please input your desired Username!",
    validate(value) {
      return /^[a-zA-Z0-9_]{2,16}$/mg.test(value)
        ? true
        : "Invalid Minecraft Username.";
    },
  });

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
  } catch (err) {
    spinner.error({
      text: "API Request failed.",
    });
    console.log(err);
  }

  new MSAPIClient({ apiUpdate, headers });
})();
