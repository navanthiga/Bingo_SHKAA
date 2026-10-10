import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TASKS } from "@/lib/tasks";

function isWinningLine(line: unknown): line is number[] {
  if (!Array.isArray(line) || line.length !== 5 ||
      !line.every(n => Number.isInteger(n) && n >= 0 && n < 25) ||
      new Set(line).size !== 5) return false;

  const rows = line.map(n => Math.floor(n / 5));
  const cols = line.map(n => n % 5);
  const sameRow = rows.every(n => n === rows[0]);
  const sameCol = cols.every(n => n === cols[0]);
  const sorted = [...line].sort((a, b) => a - b);
  const mainDiagonal = sorted.every((n, i) => n === i * 6);
  const antiDiagonal = sorted.every((n, i) => n === 4 + i * 4);
  return sameRow || sameCol || mainDiagonal || antiDiagonal;
}

async function buildSummary(db: ReturnType<typeof supabaseAdmin>, participantId: string, line: number[]) {
  const { data, error } = await db
    .from("task_submissions")
    .select("task_id,response_text,storage_path,tile_index,created_at")
    .eq("participant_id", participantId)
    .in("tile_index", line);

  if (error) throw error;
  const byTile = new Map((data ?? []).map(item => [item.tile_index, item]));
  const ordered = line.map(tileIndex => byTile.get(tileIndex));
  if (ordered.some(item => !item)) throw new Error("Could not reconstruct the winning lane.");

  return Promise.all(ordered.map(async item => {
    const task = TASKS.find(t => t.id === item!.task_id);
    let evidenceUrl: string | null = null;

    if (item!.storage_path) {
      const { data: signed, error: signedError } = await db.storage
        .from("bingo-evidence")
        .createSignedUrl(item!.storage_path, 60 * 60);
      if (signedError) throw signedError;
      evidenceUrl = signed.signedUrl;
    }

    return {
      tileIndex: item!.tile_index,
      taskId: item!.task_id,
      title: task?.title ?? `Challenge ${item!.task_id}`,
      responseText: item!.response_text,
      evidenceUrl,
      submittedAt: item!.created_at
    };
  }));
}

export async function POST(request: Request) {
  try {
    const { participantId, code, line } = await request.json();
    if (!isWinningLine(line)) {
      return NextResponse.json({ error: "That doesn't look like a valid bingo line." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: participant, error: participantError } = await db
      .from("participants")
      .select("id,name")
      .eq("id", participantId)
      .eq("participant_code", String(code ?? ""))
      .maybeSingle();

    if (participantError) throw participantError;
    if (!participant) return NextResponse.json({ error: "Participant check failed." }, { status: 401 });

    const { data: submissions, error: submissionsError } = await db
      .from("task_submissions")
      .select("tile_index")
      .eq("participant_id", participantId);

    if (submissionsError) throw submissionsError;
    const occupied = new Set((submissions ?? []).map(item => item.tile_index));
    if (!line.every((tile: number) => occupied.has(tile))) {
      return NextResponse.json({ error: "Your submitted lane doesn't match your saved board." }, { status: 400 });
    }

    // Preserve the first submitted winning lane for this participant.
    const { data: existing, error: existingError } = await db
      .from("bingo_submissions")
      .select("winning_line")
      .eq("participant_id", participantId)
      .maybeSingle();

    if (existingError) throw existingError;

    let savedLine: number[] = line;
    if (existing) {
      savedLine = existing.winning_line as number[];
    } else {
      const { error: insertError } = await db.from("bingo_submissions")
        .insert({ participant_id: participantId, winning_line: line });

      if (insertError && insertError.code !== "23505") throw insertError;
      if (insertError?.code === "23505") {
        const { data: reread, error: rereadError } = await db.from("bingo_submissions")
          .select("winning_line").eq("participant_id", participantId).single();
        if (rereadError) throw rereadError;
        savedLine = reread.winning_line as number[];
      }
    }

    const winningTasks = await buildSummary(db, participantId, savedLine);
    return NextResponse.json({
      success: true,
      alreadySubmitted: Boolean(existing),
      participantName: participant.name,
      winningLine: savedLine,
      winningTasks
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not submit BINGO. Please try again." }, { status: 500 });
  }
}
