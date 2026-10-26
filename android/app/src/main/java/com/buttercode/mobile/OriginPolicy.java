package com.buttercode.mobile;
import java.net.URI;
import java.util.Locale;
import java.util.UUID;
/** Native capabilities are available only to the packaged app's exact HTTPS origin. */
public final class OriginPolicy {
 public static final long MAX_EXPORT_BYTES=30L*1024*1024;
 public static boolean trusted(String candidate,String origin){try{URI u=new URI(candidate),o=new URI(origin);return "https".equals(u.getScheme())&&u.getUserInfo()==null&&u.getPort()==o.getPort()&&o.getHost()!=null&&o.getHost().equalsIgnoreCase(u.getHost());}catch(Exception e){return false;}}
 public static boolean recordingId(String id){try{return UUID.fromString(id).toString().equals(id);}catch(Exception e){return false;}}
 public static String assetPath(String path){if(path==null||path.isEmpty()||path.equals("/"))return "index.html";String p=path.startsWith("/")?path.substring(1):path;if(p.contains("..")||p.contains("\\")||p.contains("%")||p.indexOf('\0')>=0)return null;return p;}
 public static String safeName(String value){String clean=value==null?"export":value.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]","_").trim();if(clean.isEmpty()||clean.equals(".")||clean.equals(".."))clean="export";return clean.substring(0,Math.min(clean.length(),120));}
 public static boolean exportMime(String value){return value!=null&&value.length()<=100&&!value.matches("(?s).*[\\r\\n\\x00].*")&&(value.equals("application/pdf")||value.equals("application/json")||value.equals("application/octet-stream")||value.equals("video/mp4")||value.equals("video/webm")||java.util.Set.of("text/plain","text/csv","text/markdown","text/vtt").contains(value.split(";",2)[0]));}
 private OriginPolicy(){}
}
