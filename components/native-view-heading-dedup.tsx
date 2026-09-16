"use client";

export default function NativeViewHeadingDedup(){
  return <style jsx global>{`
    [data-inline-native] > div:first-child:not(.m238-native-view){
      display:none !important;
    }
  `}</style>;
}
