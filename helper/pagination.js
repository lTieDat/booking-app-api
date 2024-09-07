module.exports =(objectPagination, query,countRecords)=>{
    if(query.page){
        objectPagination.currentPage = parseInt(query.page);
    }
    if(query.limit){
        objectPagination.limitItem = parseInt(query.limit);
    }
    //cong thuc tinh pagination
    objectPagination.skip = (objectPagination.currentPage - 1) * objectPagination.limitItem;
    //tinh so pages  
    const totalPage = Math.ceil(countRecords / objectPagination.limitItem);
    objectPagination.totalPage = totalPage;
    return objectPagination;
}