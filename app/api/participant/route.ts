import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { name, code } = await request.json();
    const cleanName = String(name ?? "").trim().slice(0, 70);
    const cleanCode = String(code ?? "").trim();
    if (cleanName.length < 2 || cleanCode.length < 4 || cleanCode.length > 32) {
      return NextResponse.json({ error: "Enter your name and a participant code of 4–32 characters." }, { status: 400 });
    }
    const db = supabaseAdmin();
    const { data: existing, error: lookupError } = await db.from("participants").select("id,name,participant_code").eq("participant_code", cleanCode).maybeSingle();
    if (lookupError) throw lookupError;
    let participant = existing;
    if (participant) {
      if (participant.name.toLowerCase() !== cleanName.toLowerCase()) {
        return NextResponse.json({ error: "That code is already linked to another name. Check your code with the organizer." }, { status: 409 });
      }
    } else {
      const { data, error } = await db.from("participants").insert({ name: cleanName, participant_code: cleanCode }).select("id,name,participant_code").single();
      if (error) throw error;
      participant = data;
    }
    const { data: submissions, error: subError } = await db.from("task_submissions").select("task_id,response_text,storage_path,tile_index").eq("participant_id", participant.id);
    if (subError) throw subError;
    const { data: bingos, error: bingoError } = await db.from("bingo_submissions").select("id").eq("participant_id", participant.id);
    if (bingoError) throw bingoError;
    return NextResponse.json({ participant: { id: participant.id, name: participant.name }, submissions: submissions ?? [], bingoSent: (bingos?.length ?? 0) > 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not start your board. Check the Supabase setup and try again." }, { status: 500 });
  }
}
