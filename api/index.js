import { createRequestListener } from "@react-router/node";
import * as build from "../build/server/index.js";

const requestListener = createRequestListener({ build });

export default function handler(req, res) {
  return requestListener(req, res);
}