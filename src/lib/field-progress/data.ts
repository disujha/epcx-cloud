import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { getBlob, ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase/config";
import app from "@/lib/firebase/config";
import { getFunctions } from "firebase/functions";
import { storage } from "@/lib/firebase/config";
import { DEFAULT_FIELD_STAGES, parseJointCsv, type JointEvent, type JointRecord } from "./core";

export type FieldProject = { id: string; organizationId: string; name: string; lineNumber: string; drawingNumber: string; revision: string; areaSystem: string; workPackage: string; drawingPath?: string; drawingName?: string; stages: string[]; allowedTransitions: Record<string,string[]>; stagePrerequisites: Record<string,string[]>; createdBy: string; createdAt?: Timestamp; updatedAt?: Timestamp };
const projectsRef = (orgId: string) => collection(db,"organizations",orgId,"fieldProgressProjects");
const projectRef = (orgId: string, projectId: string) => doc(db,"organizations",orgId,"fieldProgressProjects",projectId);

export async function listFieldProjects(orgId: string): Promise<FieldProject[]> {
  const snapshot=await getDocs(query(projectsRef(orgId),orderBy("updatedAt","desc")));
  return snapshot.docs.map((entry)=>({id:entry.id,...entry.data()} as FieldProject));
}
export async function createFieldProject(input: Omit<FieldProject,"id"|"createdAt"|"updatedAt"|"stages"|"allowedTransitions"|"stagePrerequisites"> & { drawing: File; createdBy: string }) {
  const safeName=input.drawing.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-140);
  const project=doc(projectsRef(input.organizationId));
  const path=`organizations/${input.organizationId}/field-progress/${project.id}/drawings/${Date.now()}-${safeName}`;
  await uploadBytes(ref(storage,path),input.drawing,{contentType:"application/pdf",customMetadata:{organizationId:input.organizationId,projectId:project.id}});
  const stages=[...DEFAULT_FIELD_STAGES]; const allowedTransitions:Record<string,string[]>={}; stages.forEach((stage,index)=>{allowedTransitions[stage]=stages.slice(index+1,index+2);});
  const stagePrerequisites={"Accepted":["Visual examination","NDT complete"],"Released":["Accepted"]};
  const metadata={organizationId:input.organizationId,name:input.name,lineNumber:input.lineNumber,drawingNumber:input.drawingNumber,revision:input.revision,areaSystem:input.areaSystem,workPackage:input.workPackage,createdBy:input.createdBy};
  await setDoc(project,{...metadata,drawingPath:path,drawingName:input.drawing.name,stages,allowedTransitions,stagePrerequisites,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  return {id:project.id,...metadata,drawingPath:path,drawingName:input.drawing.name,stages,allowedTransitions,stagePrerequisites} as FieldProject;
}
export async function drawingObjectUrl(path: string) { const file=await getBlob(ref(storage,path));return URL.createObjectURL(file); }
export async function listJoints(orgId:string, projectId:string): Promise<JointRecord[]> {
  const snapshot=await getDocs(query(collection(projectRef(orgId,projectId),"joints"),orderBy("jointId","asc")));
  return snapshot.docs.map((entry)=>{const data=entry.data();return {id:entry.id,...data,drawingPage:Number(data.drawingPage??data.attributes?.drawing_page??data.attributes?.page)||undefined} as JointRecord;});
}
export async function importJoints(orgId:string, projectId:string, file:File) {
  let rows:Array<Record<string,string>>;
  if(file.name.toLowerCase().endsWith(".csv")) rows=parseJointCsv(await file.text());
  else if(file.name.toLowerCase().endsWith(".xlsx")) {
    const ExcelJS=(await import("exceljs")).default; const workbook=new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer()); const sheet=workbook.worksheets[0];
    if(!sheet||sheet.rowCount>10001)throw new Error("XLSX must have a first sheet with no more than 10,000 joints.");
    const headers=sheet.getRow(1).values as Array<unknown>; const keys=headers.slice(1).map((value)=>String(value??"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""));
    rows=[]; const seen=new Set<string>(); sheet.eachRow((row,index)=>{if(index===1)return;const record=Object.fromEntries(keys.map((key,i)=>[key,String(row.getCell(i+1).text??"").trim()]));const id=record.joint_id??record.joint??record.id??record.tag;if(!id)throw new Error(`Joint ID is missing on XLSX row ${index}.`);if(seen.has(id.toLowerCase()))throw new Error(`Duplicate joint ID ${id} in this import.`);seen.add(id.toLowerCase());rows.push({...record,joint_id:id});});
  } else throw new Error("Choose a CSV or XLSX joint list.");
  const existing=new Set((await listJoints(orgId,projectId)).map((joint)=>(joint.jointId??joint.id).toLowerCase()));
  const duplicates=rows.find((row)=>existing.has(row.joint_id.toLowerCase()));if(duplicates)throw new Error(`Joint ${duplicates.joint_id} is already registered.`);
  for(let offset=0;offset<rows.length;offset+=400){const batch=writeBatch(db);for(const row of rows.slice(offset,offset+400)){const id=encodeURIComponent(row.joint_id).replace(/%/g,"_").slice(0,400);const joint=doc(projectRef(orgId,projectId),"joints",id);const page=Number(row.drawing_page??row.page)||undefined;batch.set(joint,{jointId:row.joint_id,attributes:row,...(page?{drawingPage:page}:{}),createdAt:serverTimestamp()});}await batch.commit();}
  return rows.length;
}
export async function addJoint(orgId:string,projectId:string,input:{id:string;attributes:Record<string,string>;x?:number;y?:number;drawingPage?:number}) {
  const id=encodeURIComponent(input.id.trim()).replace(/%/g,"_").slice(0,400);if(!id)throw new Error("Joint ID is required.");
  await setDoc(doc(projectRef(orgId,projectId),"joints",id),{jointId:input.id.trim(),attributes:input.attributes,...(input.x!==undefined?{x:input.x,y:input.y}:{}),...(input.drawingPage?{drawingPage:input.drawingPage}:{}),createdAt:serverTimestamp()});
}
export async function updateJointPin(orgId:string,projectId:string,input:{id:string;x:number;y:number;drawingPage?:number}) {
  const id=encodeURIComponent(input.id.trim()).replace(/%/g,"_").slice(0,400);
  await updateDoc(doc(projectRef(orgId,projectId),"joints",id),{x:input.x,y:input.y,drawingPage:input.drawingPage??1});
}
export async function listJointEvents(orgId:string,projectId:string,jointId:string):Promise<JointEvent[]> {
  const refJoint=doc(projectRef(orgId,projectId),"joints",encodeURIComponent(jointId).replace(/%/g,"_").slice(0,400));
  const snapshot=await getDocs(query(collection(refJoint,"events"),orderBy("occurredAt","asc")));
  return snapshot.docs.map((entry)=>({id:entry.id,...entry.data(),occurredAt:(entry.data().occurredAt as Timestamp).toDate()} as JointEvent));
}
export async function listProjectEvents(orgId:string,projectId:string):Promise<Array<JointEvent&{jointId:string}>> {
  const events=collection(projectRef(orgId,projectId),"events");
  const snapshot=await getDocs(query(events,orderBy("occurredAt","asc")));
  return snapshot.docs.map((entry)=>({id:entry.id,...entry.data(),occurredAt:(entry.data().occurredAt as Timestamp).toDate()} as JointEvent&{jointId:string}));
}
export async function recordJointEvent(input:{organizationId:string;projectId:string;jointId:string;stage:string;occurredAt:string;crew?:string;welder?:string;wps?:string;remarks?:string;inspectionReference?:string;inspectionResult?:string;reason?:string;correctionOf?:string;confirmed:true}) {
  const call=httpsCallable<typeof input,{saved:boolean}>(getFunctions(app,"us-central1"),"recordFieldProgressEvent");return call(input);
}
export async function updateProjectSettings(orgId:string,projectId:string,input:{stages:string[];allowedTransitions:Record<string,string[]>;stagePrerequisites:Record<string,string[]>}) { await updateDoc(projectRef(orgId,projectId),{...input,updatedAt:serverTimestamp()}); }
export async function updateFieldProgressEditors(orgId:string,editorIds:string[]) { await updateDoc(doc(db,"organizations",orgId),{fieldProgressEditorIds:[...new Set(editorIds)],updatedAt:serverTimestamp()}); }
