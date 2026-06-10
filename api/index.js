import { createRequestHandler } from "@react-router/node";
import * as build from "../build/server/index.js";

const requestHandler = createRequestHandler({ build });

export default async function handler(request) {
  return requestHandler(request);
}
