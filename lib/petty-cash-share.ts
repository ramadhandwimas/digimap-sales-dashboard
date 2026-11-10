type FileSharing=Pick<Navigator,"canShare"|"share">;
export async function sharePettyCashFile(file:File,platform:FileSharing=navigator):Promise<"shared"|"cancelled"|"unsupported">{
 const data={files:[file],title:file.name};
 if(!platform.share||!platform.canShare?.({files:data.files}))return "unsupported";
 // Call before any await: iOS requires the original button-tap activation.
 try{await platform.share(data);return "shared"}catch(error){if(error instanceof Error&&error.name==="AbortError")return "cancelled";throw error}
}
