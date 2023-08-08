import { Spinner } from "nanospinner";
import { Authflow, Titles } from "prismarine-auth";

export async function authenticate(
  email: string,
  password: string,
  authSpinner: Spinner,
) {
  const authflow = new Authflow(email, undefined, {
    flow: "live",
    password: password,
    authTitle: Titles.MinecraftJava,
  }, (res) => {
    console.log("First time signing in. Please authenticate!");
    console.log("URL:", res.verification_uri);
    console.log("Code:", res.device_code);
    authSpinner.start();
  });
  try {
    const mcToken = await authflow.getMinecraftJavaToken();
    if ("token" in mcToken && mcToken.token) {
      authSpinner.success({
        text: "Authenticated successfully!",
      });
      return mcToken.token;
    } else return undefined;
  } catch (_err) {
    authSpinner.error({
        text: "Authentication failed!",
      });
    return undefined;
  }
}
