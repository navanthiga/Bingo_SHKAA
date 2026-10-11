import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TASKS } from "@/lib/tasks";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 500 * 1024;
const ALLOWED_TYPES = ["image/jpeg"];

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  try {
    const form = await request.formData();
    const participantId = String(form.get("participantId") ?? "");
    const code = String(form.get("code") ?? "");
    const taskId = Number(form.get("taskId"));
    const responseText = String(form.get("responseText") ?? "").trim();
    const file = form.get("file");
    const task = TASKS.find(t => t.id === taskId);
    if (!task) return NextResponse.json({ error: "Unknown challenge." }, { status: 400 });
    if (task.kind === "text" && !responseText) return NextResponse.json({ error: "Please fill in the required answer." }, { status: 400 });
    if (task.kind === "photo" && !(file instanceof File)) return NextResponse.json({ error: "Please upload a photo or screenshot." }, { status: 400 });
    if (file instanceof File && (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE)) {
      return NextResponse.json({ error: "Images must be compressed to 500 KB or less before upload. Please reselect the image and try again." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: participant, error: authError } = await db.from("participants").select("id").eq("id", participantId).eq("participant_code", code).maybeSingle();
    if (authError) throw authError;
    if (!participant) return NextResponse.json({ error: "Participant check failed. Refresh and join again." }, { status: 401 });

    const { data: existing, error: existingError } = await db.from("task_submissions").select("task_id").eq("participant_id", participantId).eq("task_id", taskId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ error: "You've already completed this prompt." }, { status: 409 });

    if (file instanceof File) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      uploadedPath = `${participantId}/${taskId}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await db.storage.from("bingo-evidence").upload(uploadedPath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
    }

    const { data: used, error: usedError } = await db.from("task_submissions").select("tile_index").eq("participant_id", participantId);
    if (usedError) throw usedError;
    const occupied = new Set((used ?? []).map(s => s.tile_index));
    const available = Array.from({ length: 25 }, (_, i) => i).filter(i => !occupied.has(i));
    if (!available.length) return NextResponse.json({ error: "All board tiles are already filled." }, { status: 409 });
    const tileIndex = available[Math.floor(Math.random() * available.length)];
    const { data: submission, error: insertError } = await db.from("task_submissions").insert({
      participant_id: participantId, task_id: taskId, response_text: task.kind === "text" ? responseText : responseText || null,
      storage_path: uploadedPath, tile_index: tileIndex
    }).select("task_id,response_text,storage_path,tile_index").single();
    if (insertError) throw insertError;
    return NextResponse.json({ submission });
  } catch (e) {
    console.error(e);
    if (uploadedPath) {
      try { await supabaseAdmin().storage.from("bingo-evidence").remove([uploadedPath]); } catch {}
    }
    return NextResponse.json({ error: "Could not save your submission. Check your connection and try again." }, { status: 500 });
  }
}
