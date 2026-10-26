package com.buttercode.mobile;
import org.junit.Test;import static org.junit.Assert.*;
public class OriginPolicyTest {
 @Test public void exactOriginOnly(){String o="https://contractcheck.online";assertTrue(OriginPolicy.trusted(o+"/report",o));for(String s:new String[]{"http://contractcheck.online","https://contractcheck.online.evil.test","https://contractcheck.online@evil.test","https://evil.test@contractcheck.online","https://contractcheck.online:443","file:///etc/passwd","javascript:alert(1)","null"})assertFalse(s,OriginPolicy.trusted(s,o));}
 @Test public void filesCannotEscapeTheirRoots(){for(String p:new String[]{"/../secret","/%2e%2e/secret","/a\\b","/a\u0000b"})assertNull(p,OriginPolicy.assetPath(p));assertEquals("index.html",OriginPolicy.assetPath("/"));assertEquals("assets/signs/stop.svg",OriginPolicy.assetPath("/assets/signs/stop.svg"));}
 @Test public void exportNamesAndTypesAreBounded(){assertEquals(".._private.pdf",OriginPolicy.safeName("../private.pdf"));assertTrue(OriginPolicy.safeName("x".repeat(300)).length()<=120);assertFalse(OriginPolicy.exportMime("text/html;\r\nHeader:x"));assertTrue(OriginPolicy.exportMime("application/pdf"));assertFalse(OriginPolicy.exportMime("application/vnd.android.package-archive"));}
 @Test public void recordingHandlesAreUnambiguous(){assertTrue(OriginPolicy.recordingId("11111111-1111-4111-8111-111111111111"));assertFalse(OriginPolicy.recordingId("../../recording"));assertFalse(OriginPolicy.recordingId("1-1-1-1-1"));}
}
