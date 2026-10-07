"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Image as ImageIcon, LoaderCircle, RotateCw, ScanText, ZoomIn, ZoomOut } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { downloadDocument } from "@/lib/firebase/storage";
import { EpcxSpinner } from "@/components/ui/EpcxSpinner";

type RecordDoc={id:string;type:"TBT"|"PHOTO";title?:string;fileName?:string;filePath:string;mimeType?:string;documentDate?:string;recordDate?:string;ocrStatus?:string;rawOcrText?:string;createdAt?:string;relatedRecords?:string[];area?:string;topic?:string;supervisor?:string;manpower?:string;workers?:string;staff?:string;remarks?:string;projectName?:string};

export function FieldRecordWorkbench({recordId,onBack}:{recordId:string;onBack:()=>void}){
  const {user}=useAuth();
  const [record,setRecord]=useState<RecordDoc|null>(null);
  const [url,setUrl]=useState("");
  const [error,setError]=useState("");
  const [zoom,setZoom]=useState(1);
  const [rotation,setRotation]=useState(0);
  const [readingText,setReadingText]=useState(false);
  const [textMessage,setTextMessage]=useState("");
  useEffect(()=>{
    let active=true;let objectUrl="";
    async function load(){
      if(!user||user.isAnonymous)return;
      try{
        const snapshot=await getDoc(doc(db,"users",user.uid,"fieldDocuments",recordId));
        if(!snapshot.exists())throw new Error("This record is no longer available in your workspace.");
        const data=snapshot.data() as RecordDoc;
        if(data.type!=="TBT"&&data.type!=="PHOTO")throw new Error("This record type opens in its own workbench.");
        if(!data.filePath.startsWith(`documents/${user.uid}/`))throw new Error("This file does not belong to the current account.");
        const file=await downloadDocument(data.filePath);objectUrl=URL.createObjectURL(file);
        if(active){setRecord({...data,id:snapshot.id});setUrl(objectUrl);}
      }catch(cause){if(active)setError(cause instanceof Error?cause.message:"The record could not be opened. Check your connection and retry.");}
    }
    void load();return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[recordId,user]);
  const date=record?.documentDate||record?.recordDate||record?.createdAt||"";
  const dateLabel=date?new Date(/^\d{4}-\d{2}-\d{2}$/.test(date)?`${date}T12:00:00`:date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"Date not set";
  const isPdf=record?.mimeType==="application/pdf"||record?.fileName?.toLowerCase().endsWith(".pdf");
  async function readPdfText(){
    if(!record||!user||record.type!=="TBT")return;
    setReadingText(true);setTextMessage("");
    try{
      const file=await downloadDocument(record.filePath);
      const pdfjs=await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdfjs-dist/build/pdf.worker.min.mjs",import.meta.url).toString();
      const loading=pdfjs.getDocument({data:await file.arrayBuffer()});
      let text="";
      try{const pdf=await loading.promise;const pages:string[]=[];for(let page=1;page<=pdf.numPages;page++){const content=await pdf.getPage(page).then((item)=>item.getTextContent());pages.push(content.items.flatMap((item)=>"str" in item&&item.str.trim()?[item.str]:[]).join(" "));}text=pages.join("\n").replace(/[ \t]+/g," ").trim();}
      finally{await loading.destroy();}
      if(!text){setTextMessage("No selectable text found. This may be a scanned PDF; image OCR is not configured yet.");return;}
      const updated={...record,ocrStatus:"processed",rawOcrText:text,updatedAt:new Date().toISOString()};
      await setDoc(doc(db,"users",user.uid,"fieldDocuments",record.id),updated,{merge:true});setRecord(updated);setTextMessage("Selectable PDF text saved. Review it below.");
    }catch(cause){setTextMessage(cause instanceof Error?cause.message:"Could not read the PDF text.");}
    finally{setReadingText(false);}
  }
  return <main className="field-common-workbench">
    <header className="field-common-toolbar"><button onClick={onBack}><ArrowLeft size={17}/>Workspace</button><div><p>{record?.type==="TBT"?"TOOLBOX TALK":"SITE PHOTO"} · {dateLabel}</p><h1>{record?.title||record?.fileName||"Opening field record…"}</h1></div><div className="field-common-controls"><button onClick={()=>setZoom((value)=>Math.min(3,value+.15))} aria-label="Zoom in"><ZoomIn size={17}/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom((value)=>Math.max(.5,value-.15))} aria-label="Zoom out"><ZoomOut size={17}/></button><button onClick={()=>setRotation((value)=>(value+90)%360)} aria-label="Rotate"><RotateCw size={17}/></button></div></header>
    {error?<div className="field-common-message"><FileText size={22}/><b>Could not open this record</b><p>{error}</p><button onClick={onBack}>Back to workspace</button></div>:<><div className="field-common-stage">{url?isPdf?<iframe title={record?.title||"Field record"} src={`${url}#toolbar=1&navpanes=0`} style={{transform:`scale(${zoom}) rotate(${rotation}deg)`}}/>:<div className="field-common-image-wrap"><img src={url} alt={record?.title||"Field record"} style={{transform:`scale(${zoom}) rotate(${rotation}deg)`}}/></div>:<div className="flex flex-col items-center justify-center p-8"><EpcxSpinner size="lg" label="Loading saved field record…" /></div>}</div>{record?.type==="TBT"&&<aside className="field-common-info"><ImageIcon size={18}/><span><b>Original saved</b><small>{record.ocrStatus==="processed"?"Selectable text saved":"For PDFs, EPCX can read selectable text. Scanned image OCR is not configured yet."}</small></span>{isPdf&&<button onClick={()=>void readPdfText()} disabled={readingText}>{readingText?<EpcxSpinner size="xs" inline />:<ScanText size={15}/>} {readingText?"Reading…":"Read PDF text"}</button>}</aside>}{record?.type==="TBT"&&<section className="field-common-tbt-details"><h2>Toolbox record</h2><dl>{[["Project",record.projectName],["Date",dateLabel],["Area",record.area],["Topic",record.topic],["Supervisor",record.supervisor],["Manpower",record.manpower],["Workers",record.workers],["Staff",record.staff],["Remarks",record.remarks]].filter(([,value])=>Boolean(value)).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}{record?.type==="TBT"&&textMessage&&<div className="field-common-text-result"><p>{textMessage}</p>{record.rawOcrText&&<pre>{record.rawOcrText}</pre>}</div>}</>}
  </main>;
}
