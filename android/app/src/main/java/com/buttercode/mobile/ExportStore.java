package com.buttercode.mobile;
import android.util.Base64;
import java.io.*;import java.util.UUID;
final class ExportStore {
 private final File directory;private File active;private OutputStream output;private String token;private long expected,written;private int sequence;
 String name,mime;
 ExportStore(File root){directory=new File(root,"exports");directory.mkdirs();}
 synchronized String begin(String fileName,String contentType,long size)throws IOException{
  if(output!=null)throw new IOException("Finish the current export first.");if(size<1||size>OriginPolicy.MAX_EXPORT_BYTES||!OriginPolicy.exportMime(contentType)||!contentType.matches("[a-zA-Z0-9!#$&^_.+/-]+(?:;[a-zA-Z0-9=_.+ -]+)?"))throw new IOException("Unsupported export type or size.");
  long total=0;for(File f:directory.listFiles()==null?new File[0]:directory.listFiles()){if(System.currentTimeMillis()-f.lastModified()>7L*86400000)f.delete();else total+=f.length();}if(total+size>100L*1024*1024)throw new IOException("Export cache is full. Save your files and clear the export cache from Android settings.");
  token=UUID.randomUUID().toString();name=OriginPolicy.safeName(fileName);mime=contentType;active=new File(directory,token+"-"+name);expected=size;written=0;sequence=0;output=new FileOutputStream(active);return token;
 }
 synchronized void chunk(String handle,int index,String encoded)throws IOException{if(output==null||!token.equals(handle)||sequence!=index||encoded.length()>90000)throw new IOException("Invalid export transfer.");byte[] bytes;try{bytes=Base64.decode(encoded,Base64.NO_WRAP);}catch(IllegalArgumentException e){throw new IOException("Invalid export data.");}if(bytes.length>65536||written+bytes.length>expected)throw new IOException("Export exceeds its declared size.");output.write(bytes);written+=bytes.length;sequence++;}
 synchronized File finish(String handle)throws IOException{if(output==null||!token.equals(handle)||written!=expected)throw new IOException("Export is incomplete.");output.close();output=null;File completed=active;active=null;return completed;}
 synchronized void abort(){try{if(output!=null)output.close();}catch(IOException ignored){}output=null;if(active!=null)active.delete();active=null;token=null;}
}
