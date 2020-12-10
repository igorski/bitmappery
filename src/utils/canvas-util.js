export const createCanvas = () => {
    const cvs = document.createElement( "canvas" );
    const ctx = cvs.getContext( "2d" );
    return { cvs, ctx };
};
