async function init() {
    console.log("Initalized!")
    await get_metadata();
    update_metadata_card();

    fill_format_selection();
    update_codecs();
};


interface VideoMetadata {
    desc: string;
    encoding: string;
    framerate: string;
    length: number;
    name: string;
    res: string;
    site: string;
    thumbnail_url: string;
    url: string;
}
interface Resolution {
    width: number;
    height: number;
}
function get_resolution(metadata: VideoMetadata): Resolution {
    const [x, y] = metadata.res.split("x").map(Number);

    return {
        width: x,
        height: y
    };
}



let video_metadata: VideoMetadata | null = null;

//Getting metadata
async function get_metadata(): Promise<void> {

    const res = await fetch("/api/get-video-metadata", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });
    const data: any = await res.json()
    if (data.metadata !== null) {
        video_metadata = (data.metadata) as VideoMetadata;

        //Set url to the input field:

        const input_field = document.getElementById(
            "fetch-url-field",
        ) as HTMLInputElement;
        input_field.value = video_metadata.url;
    }

    update_metadata_card();
};

//Update components with metadata got
function update_metadata_card(): void {
    update_thumbnail();
    update_metadata_table();
    update_video_title();

    fill_res_select();

    fill_adv_settings();
};

//  Thumbnail logic
const thumbnail_path = "/temp/thumbnail.jpeg";
const fallback_thumbnail = "/images/placeholder_thumbnail.png";

const thumbnail_img = document.getElementById("thumbnail") as HTMLImageElement;
function update_thumbnail(): void {
    thumbnail_img.src = video_metadata !== null ? thumbnail_path : fallback_thumbnail;
};

//Video title
const video_title = document.getElementById("title-header") as HTMLHeadingElement;
function update_video_title(): void {
    if (video_metadata !== null)
        video_title.textContent = video_metadata.name;
    else
        video_title.textContent = "";
};

//Metadata table

const na_rows = [
    { name: "Encoding", value: "N/A" },
    { name: "Framerate", value: "N/A fps" },
    { name: "Length", value: "N/A sec" },
    { name: "Name", value: "N/A" },
    { name: "Resolution", value: "N/A" },
];

const metadata_table = document.getElementById('metadata-table') as HTMLTableElement;
const metadata_tbody = metadata_table.tBodies[0];

//#region Aspect ration
const COMMON_ASPECT_RATIOS: { ratio: number; label: string }[] = [
    { ratio: 16 / 9, label: "16:9" },
    { ratio: 4 / 3, label: "4:3" },
    { ratio: 16 / 10, label: "16:10" },
    { ratio: 21 / 9, label: "21:9" },
    { ratio: 1 / 1, label: "1:1" },
    { ratio: 3 / 2, label: "3:2" },
    { ratio: 5 / 4, label: "5:4" },
    { ratio: 9 / 16, label: "9:16" },   // vertical/mobile video
    { ratio: 2.35 / 1, label: "2.35:1" }, // cinemascope
    { ratio: 2.39 / 1, label: "2.39:1" }, // modern cinemascope
    { ratio: 1.85 / 1, label: "1.85:1" }, // widescreen cinema
];
function get_aspect_ratio(resolution: Resolution): string {
    const { width, height } = resolution;
    const actual = width / height;
    const tolerance = 0.01;

    const match = COMMON_ASPECT_RATIOS.find(
        (r) => Math.abs(r.ratio - actual) < tolerance
    );

    if (match) {
        return match.label;
    }

    // Not a common ratio, express as X.XX:1
    return `${actual.toFixed(2)}:1`;
}

//#endregion

function update_metadata_table(): void {
    if (video_metadata !== null) {
        metadata_table.style.visibility = 'visible';
        const metadata_rows = [
            //{ name: "Description", value: video_metadata.desc },
            { name: "Encoding", value: video_metadata.encoding },
            { name: "Framerate", value: video_metadata.framerate },
            { name: "Length", value: `${Math.floor(video_metadata.length / 60)}:${String(video_metadata.length % 60).padStart(2, '0')}` },
            { name: "Resolution", value: video_metadata.res },
            { name: "Aspect ratio", value: `${get_aspect_ratio(get_resolution(video_metadata))}` }
        ];

        metadata_tbody.innerHTML = metadata_rows
            .map(
                row => `
            <tr>
                <td class="name">${row.name}</td>
                <td class="value">${row.value}</td>
            </tr>
        `
            )
            .join("");
    } else {
        metadata_table.style.visibility = 'hidden';

        metadata_tbody.innerHTML = na_rows
            .map(
                row => `
            <tr>
                <td class="name">${row.name}</td>
                <td class="value">${row.value}</td>
            </tr>
        `
            )
            .join("");
    }
};


//#region Fetch Button logic
const fetch_button = document.getElementById("fetch-url-button") as HTMLButtonElement
const url_input_field = document.getElementById("fetch-url-field") as HTMLInputElement;

function toggle_button(button: HTMLButtonElement, is_loading: boolean): void {
    button.disabled = is_loading;
    button.classList.toggle("is-loading", is_loading);

};

fetch_button.addEventListener("click", async () => {
    toggle_button(fetch_button, true);
    try {
        await fetch_video_metadata();
    } finally {
        toggle_button(fetch_button, false);
    }
});

async function fetch_video_metadata(): Promise<void> {
    console.log("Button pressed!");

    const video_url = url_input_field.value;

    const res = await fetch("/api/fetch-video-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video_url }),
    });
    const data = await res.json();

    video_metadata = (data.metadata) as VideoMetadata;
    update_metadata_card();
    console.log(data);
    console.log(data.url);
}
//#endregion

//#region User input
interface RenderSettings {
    fps?: number;
    codec?: string;
    audio_codec?: string;
    container: string;
    r_x?: number;
    r_y?: number;
    start?: number;
    length?: number;
    clr_ch_mixer?: number[];
}
let render_settings: RenderSettings = {
    container: ".mp4"
};

//#region Containers
interface VideoContainer {
    file_format: string;
    vc: string[];
    ac: string[];
}

const VIDEO_CONTAINERS: VideoContainer[] = [
    {
        file_format: ".mp4",
        vc: ["libx264", "libx265", "libaom-av1", "libsvtav1", "mpeg4"],
        ac: ["aac", "libfdk_aac", "libmp3lame", "alac"],
    },
    {
        file_format: ".mov",
        vc: ["libx264", "libx265", "prores_ks", "dnxhd", "libaom-av1"],
        ac: ["aac", "libfdk_aac", "alac", "pcm_s16le"],
    },
    {
        file_format: ".mkv",
        vc: ["libx264", "libx265", "libvpx-vp9", "libvpx", "libaom-av1", "libsvtav1", "ffv1", "mpeg4", "mpeg2video"],
        ac: ["aac", "libfdk_aac", "libmp3lame", "libopus", "flac", "libvorbis", "pcm_s16le", "alac"],
    },
    {
        file_format: ".webm",
        vc: ["libvpx-vp9", "libvpx", "libaom-av1"],
        ac: ["libopus", "libvorbis"],
    },
    {
        file_format: ".mpg",
        vc: ["mpeg2video"],
        ac: ["libmp3lame"],
    },
    {
        file_format: ".ogv",
        vc: ["libtheora"],
        ac: ["libvorbis", "libopus", "flac"],
    },
];


const format_select = document.getElementById("output-format-select") as HTMLSelectElement;

function fill_format_selection(): void {

    format_select.replaceChildren(); // Clear existing options

    for (const container of VIDEO_CONTAINERS) {
        const option = document.createElement("option");
        option.value = container.file_format;
        option.textContent = `${container.file_format}`;
        format_select.appendChild(option);
    }

}

format_select.addEventListener("change", () => {
    console.log("Container changed");
    update_codecs();
})

//#endregion

//#region Resolution
type ResFormat = {
    name: string;
    height: number;
}

const RESOLUTIONS: ResFormat[] = [
    { name: "8K UHD", height: 4320 },
    { name: "4K UHD", height: 2160 },
    { name: "Full HD", height: 1080 },
    { name: "HD", height: 720 },
    { name: "SD", height: 480 },
    { name: "360p", height: 360 },
    { name: "240p", height: 240 },
    { name: "144p", height: 144 }
];
const res_select = document.getElementById("res-select") as HTMLSelectElement;

function round_to_even(value: number): number {
    const rounded = Math.round(value);
    return rounded % 2 === 0 ? rounded : rounded + 1;
}

function fill_res_select(): void {
    res_select.replaceChildren(); // Clear existing options

    console.log("YAAT")
    if (video_metadata == null)
        return;
    console.log("YEET")
    const res = get_resolution(video_metadata);
    const max_height = res.height;

    for (const res of RESOLUTIONS) {
        if (res.height > max_height)
            continue;

        const option = document.createElement("option");
        option.value = String(res.height);
        const curr_res_w = calculate_width(res.height);
        option.textContent = `${res.name} — ${curr_res_w}x${res.height}`;
        res_select.appendChild(option);
    }

}

function calculate_width(new_height: number): number {
    //Defalut to 16:9
    if (video_metadata == null)
        return 16.0 / 9.0 * new_height;

    const res = get_resolution(video_metadata);
    const ratio = res.width / res.height;
    return round_to_even(ratio * new_height);
}
//#endregion 

//#region Advanced Settings
const set_fps_field = document.getElementById("set-fps") as HTMLInputElement;
const set_start_field = document.getElementById("set-start") as HTMLInputElement;
const set_length_field = document.getElementById("set-length") as HTMLInputElement;
const set_res_x_field = document.getElementById("set-res-x") as HTMLInputElement;
const set_res_y_field = document.getElementById("set-res-y") as HTMLInputElement;

const vc_select = document.getElementById("vc-select") as HTMLSelectElement;
const ac_select = document.getElementById("ac-select") as HTMLSelectElement;
const cl_ch_select = document.getElementById("cl-ch-select") as HTMLSelectElement;


function to_seconds(input: string): number {
    const trimmed = input.trim();

    if (trimmed.includes(":")) {
        const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);

        if (!match) {
            return NaN;
        }

        const [, mm, ss] = match;
        return Number(mm) * 60 + Number(ss);
    }

    if (!/^\d+$/.test(trimmed)) {
        return NaN;
    }

    return Number(trimmed);
}

function update_render_settings(): void {
    render_settings.container = format_select.value;
    render_settings.r_y = Number(res_select.value);
    render_settings.r_x = calculate_width(render_settings.r_y);


    //Advanced settings

    //FPS
    const fps_val = Number(set_fps_field.value);
    if (set_fps_field.value !== "" && !isNaN(fps_val)) {
        render_settings.fps = fps_val;
    } else {
        set_fps_field.value = "";
        render_settings.fps = undefined;
    }

    //Start:
    const start_val = to_seconds(set_start_field.value);
    if (set_start_field.value !== "" && !isNaN(start_val)) {
        render_settings.start = start_val;
    } else {
        set_start_field.value = "";
        render_settings.start = undefined;
    }

    //Length:
    const length_val = to_seconds(set_length_field.value);
    if (set_length_field.value !== "" && !isNaN(length_val)) {
        render_settings.length = length_val;
    } else {
        set_length_field.value = "";
        render_settings.length = undefined;
    }

    //Resolution
    const res_x = Number(set_res_x_field.value);
    const res_y = Number(set_res_y_field.value);

    if (set_res_x_field.value !== "" && !isNaN(res_x) &&
        set_res_y_field.value !== "" && !isNaN(res_y)
    ) {
        render_settings.r_x = res_x;
        render_settings.r_y = res_y;
    } else {
        set_res_x_field.value = "";
        set_res_y_field.value = "";
    }

    //Video Codec
    if (vc_select.value !== "default") {
        render_settings.codec = vc_select.value;
    }

    //Video Codec
    if (ac_select.value !== "default") {
        render_settings.audio_codec = ac_select.value;
    }

    //Color channel
    if (cl_ch_select.value !== "none") {
        const mtx = COLOR_MATRICES.find(x => x.name === cl_ch_select.value);
        if (mtx != null)
            render_settings.clr_ch_mixer = mtx.matrix;
    }
}


function fill_adv_settings(): void {
    fill_cl_ch_selection();

}
//#region Codecs
interface VideoCodec {
    name: string;
    ffmpeg_id: string;
}

const VIDEO_CODECS: VideoCodec[] = [
    { name: "H.264 / AVC", ffmpeg_id: "libx264" },
    { name: "H.265 / HEVC", ffmpeg_id: "libx265" },
    { name: "VP9", ffmpeg_id: "libvpx-vp9" },
    { name: "VP8", ffmpeg_id: "libvpx" },
    { name: "AV1", ffmpeg_id: "libaom-av1" },
    { name: "AV1 (faster)", ffmpeg_id: "libsvtav1" },
    { name: "MPEG-4", ffmpeg_id: "mpeg4" },
    { name: "MPEG-2 Video", ffmpeg_id: "mpeg2video" },
    { name: "Theora", ffmpeg_id: "libtheora" },
    { name: "ProRes", ffmpeg_id: "prores_ks" },
    { name: "DNxHD/DNxHR", ffmpeg_id: "dnxhd" },
    { name: "FFV1 (lossless)", ffmpeg_id: "ffv1" },
];

interface AudioCodec {
    name: string;
    ffmpeg_id: string;
}

const AUDIO_CODECS: AudioCodec[] = [
    { name: "AAC", ffmpeg_id: "aac" },
    { name: "AAC HE", ffmpeg_id: "libfdk_aac" },
    { name: "MP3", ffmpeg_id: "libmp3lame" },
    { name: "Opus", ffmpeg_id: "libopus" },
    { name: "Vorbis", ffmpeg_id: "libvorbis" },
    { name: "FLAC", ffmpeg_id: "flac" },
    { name: "ALAC", ffmpeg_id: "alac" },
    { name: "PCM", ffmpeg_id: "pcm_s16le" },
];


function update_codecs(): void {
    fill_vc_selection();
    fill_ac_selection();
}


function fill_vc_selection(): void {
    vc_select.replaceChildren(); // Clear existing options

    const option = document.createElement("option");
    option.value = "default";
    option.textContent = "Default";
    vc_select.appendChild(option);

    const current_selected_container = format_select.value;
    const vc_codecs = VIDEO_CONTAINERS.find(c => c.file_format === current_selected_container)!.vc


    for (const codec_id of vc_codecs) {
        const option = document.createElement("option");
        const codec = VIDEO_CODECS.find(x => x.ffmpeg_id === codec_id)!;

        option.value = codec.ffmpeg_id;
        option.textContent = codec.name;
        vc_select.appendChild(option);
    }

}


function fill_ac_selection(): void {
    ac_select.replaceChildren(); // Clear existing options

    const option = document.createElement("option");
    option.value = "default";
    option.textContent = "Default";
    ac_select.appendChild(option);


    const current_selected_container = format_select.value;
    const ac_codecs = VIDEO_CONTAINERS.find(c => c.file_format === current_selected_container)!.ac


    for (const codec_id of ac_codecs) {
        const option = document.createElement("option");
        const codec = AUDIO_CODECS.find(x => x.ffmpeg_id === codec_id)!;

        option.value = codec.ffmpeg_id;
        option.textContent = codec.name;
        ac_select.appendChild(option);
    }

}

//#endregion

//#region Color effects
interface ColorMatrix {
    name: string;
    // [rr, rg, rb, gr, gg, gb, br, bg, bb]
    matrix: [number, number, number, number, number, number, number, number, number];
}

const COLOR_MATRICES: ColorMatrix[] = [
    // --- Grayscale ---
    {
        name: "Grayscale",
        matrix: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
    },
    // --- Tinting ---
    {
        name: "Sepia",
        matrix: [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131],
    },
    {
        name: "Grayscale (BT.709 / HD)",
        matrix: [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722],
    },

    // --- Single channel isolation ---
    {
        name: "Red Channel",
        matrix: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
        name: "Red Channel (Grayscale)",
        matrix: [1, 0, 0, 1, 0, 0, 1, 0, 0],
    },
    {
        name: "Green Channel",
        matrix: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    },
    {
        name: "Green Channel (Grayscale)",
        matrix: [0, 1, 0, 0, 1, 0, 0, 1, 0],
    },
    {
        name: "Blue Channel",
        matrix: [0, 0, 0, 0, 0, 0, 0, 0, 1],
    },
    {
        name: "Blue Channel (Grayscale)",
        matrix: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    },
    {
        name: "Remove Red (Cyan Tint)",
        matrix: [0, 0, 0, 0, 1, 0, 0, 0, 1],
    },

    // --- Channel swaps / permutations ---
    {
        name: "Channel Swap (R↔B)",
        matrix: [0, 0, 1, 0, 1, 0, 1, 0, 0],
    },
    {
        name: "Channel Swap (R↔G)",
        matrix: [0, 1, 0, 1, 0, 0, 0, 0, 1],
    },
    {
        name: "Channel Swap (G↔B)",
        matrix: [1, 0, 0, 0, 0, 1, 0, 1, 0],
    },
    {
        name: "Channel Rotate (R→G→B→R)",
        matrix: [0, 1, 0, 0, 0, 1, 1, 0, 0],
    },
    {
        name: "Channel Rotate (R←G←B←R)",
        matrix: [0, 0, 1, 1, 0, 0, 0, 1, 0],
    },

];

function to_color_ch_arg(m: ColorMatrix["matrix"]): string {
    const [rr, rg, rb, gr, gg, gb, br, bg, bb] = m;
    return `colorchannelmixer=rr=${rr}:rg=${rg}:rb=${rb}:gr=${gr}:gg=${gg}:gb=${gb}:br=${br}:bg=${bg}:bb=${bb}`;
}


function fill_cl_ch_selection(): void {
    cl_ch_select.replaceChildren(); // Clear existing options

    const def_option = document.createElement("option");
    def_option.value = "None";
    def_option.textContent = "None";
    cl_ch_select.appendChild(def_option);

    for (const matrix of COLOR_MATRICES) {
        const option = document.createElement("option");
        option.value = matrix.name;
        option.textContent = matrix.name;
        cl_ch_select.appendChild(option);
    }

}


//#endregion

//#endregion 
//#endregion 



//#region Download Logic
const download_video_button = document.getElementById("download-button") as HTMLButtonElement

download_video_button.addEventListener("click", async () => {
    toggle_button(download_video_button, true);
    try {
        await download_button_logic();
    } finally {
        toggle_button(download_video_button, false);
    }
});

async function download_button_logic(): Promise<void> {


    console.log("Download button pressed!");
    update_render_settings();


    const render_status = await get_render_status()

    const render_result = await render_video();

    if(render_result == RenderStatus.DONE)
        download_video();
}


enum RenderStatus {
    NONE = "NONE",
    PENDING = "PENDING",
    RUNNING = "RUNNING",
    ERROR = "ERROR",
    DONE = "DONE",
    ABORTED = "ABORTED"
}
function render_status_from_str(value: string): RenderStatus {
    return Object.values(RenderStatus).includes(value as RenderStatus)
        ? (value as RenderStatus)
        : RenderStatus.NONE;
}

let render_state = RenderStatus.NONE;

async function get_render_status(): Promise<RenderStatus> {
    const res = await fetch("/api/get-render-status", {
        method: "GET",
    });
    const dl_data = await res.json();

    const status = render_status_from_str(dl_data.status)
    return status
}


async function render_video(): Promise<RenderStatus> {
    const start_r_res = await fetch("/api/start-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(render_settings),
    });

    console.log("Checking status")
    console.log(start_r_res.status)
    if (!start_r_res.ok) {
        //TODO handle error
        console.log("Starting render error!")
        return RenderStatus.ERROR;
    }

    console.log("Render started!");
    const poll_result = await polling_until_rendered()

    if (poll_result !== PollingResult.DONE) {
        console.log("poll error!");
        return RenderStatus.ERROR;
    }

    return RenderStatus.DONE;

}
function download_video(): void {
    window.location.href = "/api/download-video";
};

enum PollingResult {
    ERROR = "ERROR",
    DONE = "DONE",
    ABORTED = "ABORTED",
    TIMEOUT = "TIMEOUT"
}
async function polling_until_rendered(
    intervalMs = 500,
    timeoutMs = 300000): Promise<PollingResult> {
    const start = Date.now();
    console.log(start);
    while (Date.now() - start <= timeoutMs) {

        const status = await get_render_status();
        switch (status) {
            case RenderStatus.DONE:
                return PollingResult.DONE;
            case RenderStatus.ERROR:
                return PollingResult.ERROR;
            case RenderStatus.ABORTED:
                return PollingResult.ABORTED;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return PollingResult.TIMEOUT;
}


function update_render_status(status: RenderStatus): void {

}

//#endregion





interface AudioContainer {
    container: string;
    ac: string[]; // acceptable audio codec ffmpeg ids
}

const AUDIO_CONTAINERS: AudioContainer[] = [
    {
        container: ".m4a",
        ac: ["aac", "libfdk_aac", "alac"],
    },
    {
        container: ".mp3",
        ac: ["libmp3lame"],
    },
    {
        container: ".opus",
        ac: ["libopus"],
    },
    {
        container: ".ogg",
        ac: ["libvorbis", "libopus", "flac"],
    },
    {
        container: ".flac",
        ac: ["flac"],
    },
    {
        container: ".wav",
        ac: ["pcm_s16le", "alac"],
    },
];



document.getElementById("mode-toggle")?.addEventListener("click", (e) => {
    document.getElementById("mode-toggle")?.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest(".toggle-option");
        if (!btn) return;
        btn.parentElement
            ?.querySelectorAll(".toggle-option")
            .forEach((el) => el.classList.remove("is-active"));
        btn.classList.add("is-active");
    });
});

init();