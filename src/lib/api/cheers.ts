import { postJson } from "./client";

/** Biriken tokuşturmaları gönderir (api/cheer.js); yazının yeni toplamını döner. */
export const sendCheers = async (postId: string, count: number) => Number((await postJson("/api/cheer", { postId, count })).total);
