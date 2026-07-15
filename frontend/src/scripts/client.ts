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

const init = async () => {
    console.log("Initalized!")
    await get_metadata();
    update_metadata_card();

    fill_format_selection();

};


let video_metadata: VideoMetadata | null = null;

//Getting metadata
const get_metadata = async (): Promise<void> => {

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
const update_metadata_card = (): void => {
    update_thumbnail();
    update_metadata_table();
    update_video_title();

    fill_res_select();
};

//  Thumbnail logic
const thumbnail_path = "/temp/thumbnail.jpeg";
const fallback_thumbnail = "/images/placeholder_thumbnail.png";

const thumbnail_img = document.getElementById("thumbnail") as HTMLImageElement;
const update_thumbnail = (): void => {
    thumbnail_img.src = video_metadata !== null ? thumbnail_path : fallback_thumbnail;
};

//Video title
const video_title = document.getElementById("title-header") as HTMLHeadingElement;
const update_video_title = (): void => {
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

const update_metadata_table = (): void => {
    if (video_metadata !== null) {
        metadata_table.style.visibility = 'visible';
        const metadata_rows = [
            //{ name: "Description", value: video_metadata.desc },
            { name: "Encoding", value: video_metadata.encoding },
            { name: "Framerate", value: video_metadata.framerate },
            { name: "Length", value: `${Math.floor(video_metadata.length / 60)}:${video_metadata.length % 60}` },
            { name: "Resolution", value: video_metadata.res },
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


//Fetch Button logic
const fetch_button = document.getElementById("fetch-url-button") as HTMLButtonElement

const toggle_button = (button: HTMLButtonElement, is_loading: boolean): void => {
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

const fetch_video_metadata = async (): Promise<void> => {
    console.log("Button pressed!");

    const input_field = document.getElementById(
        "fetch-url-field",
    ) as HTMLInputElement;
    const video_url = input_field.value;

    const res = await fetch("/api/fetch-video-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video_url }),
    });
    const data = await res.json();

    video_metadata = (data.metadata) as VideoMetadata;
    update_metadata_card();
    console.log(data);
}

//User input
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

const update_render_settings = (): void => {
    render_settings.container = format_select.value;
    render_settings.r_y = Number(res_select.value);
}

//Fileformat
type OutputFormat = {
    extension: string;
    description: string;
};

const SHORT_OUTPUT_FORMATS: OutputFormat[] = [
    { extension: ".mp4", description: "MPEG-4 (most compatible)" },
    { extension: ".mkv", description: "Matroska (supports almost anything)" },
    { extension: ".mov", description: "QuickTime (editing workflows)" },
    { extension: ".webm", description: "Web video (VP8/VP9/AV1)" },
    { extension: ".avi", description: "Legacy AVI container" },
    { extension: ".gif", description: "Animated GIF" },

]

const OUTPUT_FORMATS: OutputFormat[] = [
    ...SHORT_OUTPUT_FORMATS,
    { extension: ".zip", description: "ZIP archive of image frames" },
    { extension: ".ts", description: "MPEG Transport Stream" },
    { extension: ".mpeg", description: "MPEG Program Stream" },
    { extension: ".mpg", description: "MPEG Program Stream" },
    { extension: ".m4v", description: "MPEG-4 video (Apple)" },
    { extension: ".wmv", description: "Windows Media Video" },
    { extension: ".flv", description: "Flash Video" },
    { extension: ".3gp", description: "Mobile phones (3GPP)" },
    { extension: ".mxf", description: "Professional broadcast" },
    { extension: ".ogv", description: "Ogg video" },
    { extension: ".asf", description: "Advanced Systems Format" },
    { extension: ".vob", description: "DVD video" },
    { extension: ".f4v", description: "Flash MP4 variant" },
    { extension: ".nut", description: "FFmpeg test container" },
    { extension: ".y4m", description: "Uncompressed YUV video" },
    { extension: ".ivf", description: "VP8/VP9 test container" },
];

const format_select = document.getElementById("output-format-select") as HTMLSelectElement;

const fill_format_selection = (): void => {

    format_select.replaceChildren(); // Clear existing options

    for (const format of SHORT_OUTPUT_FORMATS) {
        const option = document.createElement("option");
        option.value = format.extension;
        option.textContent = `${format.extension}`;
        format_select.appendChild(option);
    }

}


//Fileformat
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

const fill_res_select = (): void => {
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

const calculate_width = (new_height: number): number => {
    //Defalut to 16:9
    if (video_metadata == null)
        return 16.0 / 9.0 * new_height;

    const res = get_resolution(video_metadata);
    const ratio = res.width / res.height;
    return round_to_even(ratio * res.height);
}


//Fetch Button logic
const start_render_button = document.getElementById("fetch-url-button") as HTMLButtonElement

start_render_button.addEventListener("click", async () => {
    toggle_button(fetch_button, true);
    try {
        await start_render();
    } finally {
        toggle_button(fetch_button, false);
    }
});


const start_render = async (): Promise<void> => {

    console.log("Button pressed!");

    const input_field = document.getElementById(
        "fetch-url-field",
    ) as HTMLInputElement;
    const video_url = input_field.value;

    const res = await fetch("/api/fetch-video-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video_url }),
    });;
    const data = await res.json();

    video_metadata = (data.metadata) as VideoMetadata;
    update_metadata_card();
    console.log(data);
}


init();