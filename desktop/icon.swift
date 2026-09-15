import AppKit
let size=NSSize(width:1024,height:1024)
let image=NSImage(size:size)
image.lockFocus()
NSColor(calibratedRed:0.31,green:0.69,blue:0.99,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:48,y:48,width:928,height:928),xRadius:210,yRadius:210).fill()
let attrs:[NSAttributedString.Key:Any] = [.font:NSFont(name:"Songti SC",size:650) ?? NSFont.systemFont(ofSize:650),.foregroundColor:NSColor.white]
let text="O" as NSString
let ts=text.size(withAttributes:attrs)
text.draw(at:NSPoint(x:(1024-ts.width)/2,y:(1024-ts.height)/2+15),withAttributes:attrs)
image.unlockFocus()
let rep=NSBitmapImageRep(data:image.tiffRepresentation!)!
try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
