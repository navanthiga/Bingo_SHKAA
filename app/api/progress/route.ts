import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TASKS } from "@/lib/tasks";

async function makeWinningSummary(db: ReturnType<typeof supabaseAdmin>, participantId: string, participantName: string, line: number[]) {
  const { data, error } = await db.from("task_submissions")
    .select("task_id,response_text,storage_path,tile_index,created_at")
    .eq("participant_id", participantId)
    .in("tile_index", line);
  if (error) throw error;

  const byTile = new Map((data ?? []).map(item => [item.tile_index, item]));
  const ordered = line.map(tile => byTile.get(tile));
  if (ordered.some(item => !item)) return null;

  const winningTasks = await Promise.all(ordered.map(async item => {
    let evidenceUrl: string | null = null;
    if (item!.storage_path) {
      const { data: signed, error: signedError } = await db.storage.from("bingo-evidence")
        .createSignedUrl(item!.storage_path, 60 * 60);
      if (signedError) throw signedError;
      evidenceUrl = signed.signedUrl;
    }
    return {
      tileIndex: item!.tile_index,
      taskId: item!.task_id,
      title: TASKS.find(task => task.id === item!.task_id)?.title ?? `Challenge ${item!.task_id}`,
      responseText: item!.response_text,
      evidenceUrl,
      submittedAt: item!.created_at
    };
  }));

  return { participantName, winningLine: line, winningTasks };
}

export async function POST(request: Request) {
  try {
    const { participantId, code } = await request.json();
    const db = supabaseAdmin();
    const { data: participant, error } = await db.from("participants")
      .select("id,name").eq("id", participantId)
      .eq("participant_code", String(code ?? "")).maybeSingle();

    if (error) throw error;
    if (!participant) return NextResponse.json({ error: "Participant not found. Please join again with your code." }, { status: 401 });

    const [{ data: submissions, error: submissionsError }, { data: bingo, error: bingoError }] = await Promise.all([
      db.from("task_submissions").select("task_id,response_text,storage_path,tile_index")
        .eq("participant_id", participantId),
      db.from("bingo_submissions").select("winning_line")
        .eq("participant_id", participantId).maybeSingle()
    ]);

    if (submissionsError) throw submissionsError;
    if (bingoError) throw bingoError;

    let winningSummary = null;
    if (bingo?.winning_line) {
      winningSummary = await makeWinningSummary(db, participantId, participant.name, bingo.winning_line as number[]);
    }

    return NextResponse.json({
      submissions: submissions ?? [],
      bingoSent: Boolean(bingo),
      winningSummary
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load progress." }, { status: 500 });
  }
}
