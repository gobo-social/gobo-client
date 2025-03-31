import FS from "node:fs/promises";
import fetch from "node-fetch";
import { getSecret } from "@dashkite/dolores/secrets";
import { confidential } from "panda-confidential";
import getGOBOClient from "../src/index.js";
import { exists } from "./fs.js";

const TOKEN_PATH = 'tasks/access-token.txt';

const Confidential = confidential();

const random = async function ( config = {} ) {
  const { length = 16, encoding = "base36" } = config

  return Confidential.convert({ from: "bytes", to: encoding }, 
    await Confidential.randomBytes(length) );
};

const getFlag = function ( name, config ) {
  const value = config.args[ name ];
  if ( value == null ) {
    throw new Error( `command flag \"${ name }\" is not set.` );
  }
  return value;
};

const _getToken = async () => {
  const response = await fetch(
    "https://gobo.outseta.com/tokens", {
    method: "POST",
    headers: { 
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      username: await getSecret("gobo-client-login-test/username"),
      password: await getSecret("gobo-client-login-test/password"),
    }).toString(),
  });

  const { access_token } = await response.json();
  await FS.writeFile(TOKEN_PATH, access_token, {encoding: "utf-8"});

  return access_token;
};

const getToken = async () => {
  if ( await exists( TOKEN_PATH )) {
    return FS.readFile(TOKEN_PATH, 'utf-8');
  } else {
    return _getToken(); 
  }
};

const getGOBO = async function (config) {
  if ( config.gobo == null ) {
    throw new Error( "There is no GOBO config specified for this environment" );
  }

  const token = await getToken();  

  return await getGOBOClient({ ...config.gobo, token, fetch });
};

export {
  getFlag,
  getGOBO,
  random
}